-- =============================================================================
-- Ntcharkou — Migration 12 : compter les unites reservees, pas les adherents
-- =============================================================================
-- Un adherent peut demander plusieurs unites. L'avancement d'un projet se
-- mesure donc en unites, pas en personnes : un adherent ayant obtenu 2 unites
-- en consomme 2 sur les N du projet.
--
-- La vue publiait `participants_confirmed` (un `count(*)`), que l'interface
-- affichait comme un nombre d'unites — d'ou « 1 / 20 » pour une adhesion de
-- 2 unites. On expose desormais les deux grandeurs, distinctes et nommees :
--   · participants_confirmed / participants_pending -> des personnes
--   · units_reserved / units_pending                -> des unites
--
-- Meme correction pour la constitution automatique du groupe, qui comparait un
-- nombre de personnes a un nombre d'unites : un projet de 20 unites se serait
-- declare complet avec 20 adherents ayant reserve 35 unites.
--
-- La migration est rejouable.

-- -----------------------------------------------------------------------------
-- 1. Vue publique : unites reservees et unites en attente
-- -----------------------------------------------------------------------------

drop view if exists public.projects_public;

create view public.projects_public
with (security_invoker = on) as
  select
    p.id,
    p.reference,
    p.title,
    p.summary,
    p.description,
    p.region_code,
    r.name_fr                       as region_name,
    coalesce(r.name_ar, r.name_fr)  as region_name_ar,
    p.city_id,
    c.name_fr                       as city_name,
    coalesce(c.name_ar, c.name_fr)  as city_name_ar,
    p.district,
    p.property_need,
    p.zoning,
    p.units_planned,
    p.participants_target,
    p.budget_per_unit,
    p.unit_surface_m2,
    p.unit_price_per_m2,
    p.market_price_per_m2,
    p.unit_price,
    p.market_unit_price,
    case
      when p.unit_price is not null and p.market_unit_price is not null
        then p.market_unit_price - p.unit_price
    end as savings_amount,
    case
      when p.unit_price is not null and p.market_unit_price is not null
           and p.market_unit_price > 0
        then round((p.market_unit_price - p.unit_price) / p.market_unit_price * 100, 1)
    end as savings_percent,
    p.restricted_to_body,
    p.status,
    p.land_id,
    p.cover_image_path,
    p.opened_at,
    p.created_at,
    -- Des personnes.
    (
      select count(*) from public.project_participants pp
      where pp.project_id = p.id and pp.status = 'accepte'
    ) as participants_confirmed,
    (
      select count(*) from public.project_participants pp
      where pp.project_id = p.id and pp.status = 'candidature'
    ) as participants_pending,
    -- Des unites : c'est ce qui remplit le projet.
    (
      select coalesce(sum(pp.units_wanted), 0) from public.project_participants pp
      where pp.project_id = p.id and pp.status = 'accepte'
    ) as units_reserved,
    (
      select coalesce(sum(pp.units_wanted), 0) from public.project_participants pp
      where pp.project_id = p.id and pp.status = 'candidature'
    ) as units_pending
  from public.projects p
  join public.regions r on r.code = p.region_code
  left join public.cities c on c.id = p.city_id;

grant select on public.projects_public to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Constitution automatique du groupe, mesuree en unites
-- -----------------------------------------------------------------------------

create or replace function public.trg_project_participation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  proj     public.projects;
  reserved integer;
begin
  select * into proj from public.projects where id = coalesce(new.project_id, old.project_id);
  if not found then
    return coalesce(new, old);
  end if;

  -- Toute l'administration est prevenue d'une nouvelle demande d'adhesion.
  if tg_op = 'INSERT' then
    insert into public.notifications (profile_id, kind, title, body, url, payload)
    select pr.id,
           'candidature_recue'::public.notification_kind,
           'Nouvelle demande d''adhesion',
           format('Une demande d''adhesion de %s unite(s) vient d''etre deposee sur « %s ».',
                  new.units_wanted, proj.title),
           '/admin/adhesions',
           jsonb_build_object('project_id', proj.id, 'participation_id', new.id)
    from public.profiles pr
    where pr.role = 'admin'
      and not pr.is_suspended
      and pr.id <> new.participant_id;
  end if;

  -- Le candidat est prevenu de la decision administrative.
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'accepte' then
      insert into public.notifications (profile_id, kind, title, body, url, payload)
      values (new.participant_id, 'candidature_acceptee',
              'Votre adhesion est validee',
              format('Vous rejoignez le projet « %s » pour %s unite(s).',
                     proj.title, new.units_wanted),
              '/projets/' || proj.id,
              jsonb_build_object('project_id', proj.id));
    elsif new.status = 'refuse' then
      insert into public.notifications (profile_id, kind, title, body, url, payload)
      values (new.participant_id, 'candidature_refusee',
              'Votre demande d''adhesion n''a pas ete retenue',
              format('Projet « %s ».', proj.title),
              '/projets/' || proj.id,
              jsonb_build_object('project_id', proj.id));
    end if;
  end if;

  -- Le groupe est complet quand toutes les UNITES sont reservees.
  select coalesce(sum(units_wanted), 0) into reserved
  from public.project_participants
  where project_id = proj.id and status = 'accepte';

  if proj.status = 'ouvert' and reserved >= proj.units_planned then
    update public.projects set status = 'groupe_constitue' where id = proj.id;

    insert into public.notifications (profile_id, kind, title, body, url, payload)
    select pp.participant_id, 'projet_complet'::public.notification_kind,
           'Le groupe est au complet',
           format('Les %s unites du projet « %s » sont reservees.',
                  proj.units_planned, proj.title),
           '/projets/' || proj.id,
           jsonb_build_object('project_id', proj.id)
    from public.project_participants pp
    where pp.project_id = proj.id and pp.status = 'accepte';
  end if;

  return coalesce(new, old);
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. File d'attente administrative : montrer le remplissage en unites
-- -----------------------------------------------------------------------------
-- L'administration doit voir, avant de trancher, combien d'unites restent
-- reellement disponibles — accepter 3 unites sur un projet qui n'en a plus que
-- 2 est une decision qu'on ne peut pas rattraper silencieusement.

drop function if exists public.admin_pending_participations();

create function public.admin_pending_participations()
returns table (
  id             uuid,
  project_id     uuid,
  project_title  text,
  project_ref    text,
  units_planned  integer,
  units_reserved bigint,
  participant    text,
  body           public.professional_body,
  units_wanted   integer,
  message        text,
  created_at     timestamptz
)
language sql
security definer
set search_path = public
as $$
  select pp.id,
         p.id,
         p.title,
         p.reference,
         p.units_planned,
         (select coalesce(sum(x.units_wanted), 0) from public.project_participants x
           where x.project_id = p.id and x.status = 'accepte'),
         concat_ws(' ', pr.first_name, pr.last_name),
         part.professional_body,
         pp.units_wanted,
         pp.message,
         pp.created_at
  from public.project_participants pp
  join public.projects p  on p.id = pp.project_id
  join public.profiles pr on pr.id = pp.participant_id
  left join public.participant_profiles part on part.profile_id = pp.participant_id
  where pp.status = 'candidature'
    and public.is_admin()
  order by pp.created_at;
$$;

revoke execute on function public.admin_pending_participations() from public;
grant execute on function public.admin_pending_participations() to authenticated;
