-- =============================================================================
-- Ntcharkou — Migration 11 : le projet participatif devient un acte administratif
-- =============================================================================
-- Trois changements de fond :
--
--   1. Prix — le projet porte desormais le prix participatif ET le prix du
--      marche, tous deux saisis par l'administration. C'est ce couple qui
--      permet d'afficher l'economie realisee par l'adherent.
--
--   2. Creation — seule l'administration transforme un terrain valide en projet
--      participatif. Un particulier ne peut plus creer de projet : il exprime
--      un interet, l'administration instruit.
--
--   3. Adhesions — les candidatures remontent a l'administration, qui les
--      tranche ; le candidat est notifie de la decision.
--
-- La migration est rejouable, mais UNIQUEMENT dans l'ordre : chaque objet est
-- precede de son `drop ... if exists`, y compris sous son nouveau nom.
--
-- ⚠ Ne la rejouez pas APRES une migration ulterieure. Elle recree la vue
--   `projects_public` dans sa forme d'alors : la rejouer apres la migration 12
--   supprime les colonnes `units_reserved` / `units_pending`, et les compteurs
--   d'unites retombent a 0. Si cela arrive, rejouez simplement la migration la
--   plus recente, qui retablit la vue complete.

-- -----------------------------------------------------------------------------
-- 1. Prix et capacite d'une unite
-- -----------------------------------------------------------------------------
-- L'administration renseigne ces champs « apres etude » : le nombre d'unites
-- existe des la creation, la grille de prix peut arriver ensuite. Les colonnes
-- restent donc nullables et l'interface n'affiche le comparatif que lorsqu'il
-- est complet.

alter table public.projects
  add column if not exists unit_surface_m2 numeric(10, 2)
    check (unit_surface_m2 is null or unit_surface_m2 > 0),
  add column if not exists unit_price_per_m2 numeric(12, 2)
    check (unit_price_per_m2 is null or unit_price_per_m2 >= 0),
  add column if not exists market_price_per_m2 numeric(12, 2)
    check (market_price_per_m2 is null or market_price_per_m2 >= 0);

comment on column public.projects.unit_surface_m2 is
  'Surface moyenne d''une unite (m2), fixee par l''administration apres etude.';
comment on column public.projects.unit_price_per_m2 is
  'Prix participatif au m2 paye par l''adherent.';
comment on column public.projects.market_price_per_m2 is
  'Prix du marche au m2 pour le meme secteur — sert de reference comparative.';

-- Prix d'une unite, cote participatif et cote marche. Colonnes generees : le
-- comparatif affiche ne peut pas diverger de la grille saisie.
alter table public.projects
  add column if not exists unit_price numeric(14, 2)
    generated always as (
      case
        when unit_surface_m2 is not null and unit_price_per_m2 is not null
          then round(unit_surface_m2 * unit_price_per_m2, 2)
      end
    ) stored;

alter table public.projects
  add column if not exists market_unit_price numeric(14, 2)
    generated always as (
      case
        when unit_surface_m2 is not null and market_price_per_m2 is not null
          then round(unit_surface_m2 * market_price_per_m2, 2)
      end
    ) stored;

-- -----------------------------------------------------------------------------
-- 2. Creation reservee a l'administration
-- -----------------------------------------------------------------------------

drop policy if exists "projet : creation d'un groupe" on public.projects;
drop policy if exists "projet : creation reservee a l'administration" on public.projects;

create policy "projet : creation reservee a l'administration" on public.projects
  for insert with check (public.is_admin());

-- Le porteur ne peut plus modifier un projet : l'instruction est administrative.
drop policy if exists "projet : mise a jour" on public.projects;
drop policy if exists "projet : mise a jour par l'administration" on public.projects;
create policy "projet : mise a jour par l'administration" on public.projects
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "projet : suppression d'une proposition" on public.projects;
drop policy if exists "projet : suppression par l'administration" on public.projects;
create policy "projet : suppression par l'administration" on public.projects
  for delete using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. Vue publique : prix, economie et remplissage
-- -----------------------------------------------------------------------------
-- `units_planned` est la reference d'avancement demandee : on compare le nombre
-- d'adherents confirmes au nombre total d'unites du projet.

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
    -- Economie par unite, en valeur et en pourcentage du prix du marche.
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
    (
      select count(*) from public.project_participants pp
      where pp.project_id = p.id and pp.status = 'accepte'
    ) as participants_confirmed,
    (
      select count(*) from public.project_participants pp
      where pp.project_id = p.id and pp.status = 'candidature'
    ) as participants_pending
  from public.projects p
  join public.regions r on r.code = p.region_code
  left join public.cities c on c.id = p.city_id;

grant select on public.projects_public to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Les candidatures remontent a l'administration
-- -----------------------------------------------------------------------------
-- Le declencheur d'origine ne prevenait que `created_by`. Les projets etant
-- desormais crees par l'administration, on notifie l'ensemble des comptes
-- administrateurs actifs — sans quoi une candidature deposee sur un projet cree
-- par un collegue passerait inapercue.

create or replace function public.trg_project_participation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  proj      public.projects;
  confirmed integer;
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
           format('Une demande d''adhesion vient d''etre deposee sur « %s ».', proj.title),
           '/admin/projets?projet=' || proj.id,
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
              format('Vous rejoignez le projet « %s ».', proj.title),
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

  -- Groupe complet -> le projet bascule automatiquement.
  select count(*) into confirmed
  from public.project_participants
  where project_id = proj.id and status = 'accepte';

  if proj.status = 'ouvert' and confirmed >= proj.participants_target then
    update public.projects set status = 'groupe_constitue' where id = proj.id;

    insert into public.notifications (profile_id, kind, title, body, url, payload)
    select pp.participant_id, 'projet_complet'::public.notification_kind,
           'Le groupe est au complet',
           format('Le projet « %s » a reuni ses %s participants.', proj.title, proj.participants_target),
           '/projets/' || proj.id,
           jsonb_build_object('project_id', proj.id)
    from public.project_participants pp
    where pp.project_id = proj.id and pp.status = 'accepte';
  end if;

  return coalesce(new, old);
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Transformer un terrain valide en projet participatif
-- -----------------------------------------------------------------------------
-- Point d'entree unique de la creation. SECURITY DEFINER pour ecrire malgre la
-- RLS, mais le premier test est `is_admin()` : la fonction n'ouvre aucun chemin
-- detourne. Le terrain doit avoir passe la verification administrative.

create or replace function public.admin_create_project_from_land(
  p_land                uuid,
  p_title               text,
  p_units_planned       integer,
  p_property_need       public.property_need,
  p_summary             text default null,
  p_description         text default null,
  p_unit_surface_m2     numeric default null,
  p_unit_price_per_m2   numeric default null,
  p_market_price_per_m2 numeric default null,
  p_restricted_to_body  public.professional_body default null,
  p_open                boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  land public.land_listings;
  new_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Reserve a l''administration.' using errcode = '42501';
  end if;

  select * into land from public.land_listings where id = p_land;
  if not found then
    raise exception 'Terrain introuvable.' using errcode = 'P0002';
  end if;

  -- Un projet ne se construit que sur un terrain dont l'administration a
  -- verifie le dossier.
  if land.status not in ('valide', 'publie') then
    raise exception 'Le terrain doit etre valide avant d''ouvrir un projet.'
      using errcode = '22023';
  end if;

  if p_units_planned is null or p_units_planned <= 0 then
    raise exception 'Le nombre d''unites doit etre positif.' using errcode = '22023';
  end if;

  insert into public.projects (
    title, summary, description,
    created_by, land_id,
    region_code, city_id, district,
    property_need, zoning,
    units_planned, participants_target,
    unit_surface_m2, unit_price_per_m2, market_price_per_m2,
    budget_per_unit,
    restricted_to_body,
    status, opened_at, reviewed_at, reviewed_by
  )
  values (
    p_title, p_summary, p_description,
    auth.uid(), p_land,
    land.region_code, land.city_id, land.district,
    p_property_need, land.zoning,
    p_units_planned, p_units_planned,
    p_unit_surface_m2, p_unit_price_per_m2, p_market_price_per_m2,
    case
      when p_unit_surface_m2 is not null and p_unit_price_per_m2 is not null
        then round(p_unit_surface_m2 * p_unit_price_per_m2, 2)
    end,
    p_restricted_to_body,
    case when p_open then 'ouvert' else 'validation_admin' end::public.project_status,
    case when p_open then now() end,
    now(), auth.uid()
  )
  returning id into new_id;

  insert into public.admin_actions (admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'projet_cree_depuis_terrain', 'projects', new_id,
          jsonb_build_object('land_id', p_land, 'units_planned', p_units_planned));

  return new_id;
end;
$$;

-- Mise a jour de la grille « apres etude » : unites et prix.
create or replace function public.admin_set_project_pricing(
  p_project             uuid,
  p_units_planned       integer,
  p_unit_surface_m2     numeric,
  p_unit_price_per_m2   numeric,
  p_market_price_per_m2 numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Reserve a l''administration.' using errcode = '42501';
  end if;

  if p_units_planned is null or p_units_planned <= 0 then
    raise exception 'Le nombre d''unites doit etre positif.' using errcode = '22023';
  end if;

  update public.projects
     set units_planned       = p_units_planned,
         participants_target = p_units_planned,
         unit_surface_m2     = p_unit_surface_m2,
         unit_price_per_m2   = p_unit_price_per_m2,
         market_price_per_m2 = p_market_price_per_m2,
         budget_per_unit     = case
           when p_unit_surface_m2 is not null and p_unit_price_per_m2 is not null
             then round(p_unit_surface_m2 * p_unit_price_per_m2, 2)
           else budget_per_unit
         end,
         updated_at          = now()
   where id = p_project;

  if not found then
    raise exception 'Projet introuvable.' using errcode = 'P0002';
  end if;

  insert into public.admin_actions (admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'projet_grille_tarifaire', 'projects', p_project,
          jsonb_build_object('units_planned', p_units_planned,
                             'unit_price_per_m2', p_unit_price_per_m2,
                             'market_price_per_m2', p_market_price_per_m2));
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Traitement administratif d'une demande d'adhesion
-- -----------------------------------------------------------------------------
-- La notification du candidat est produite par le declencheur ci-dessus : elle
-- part dans la meme transaction que la decision, donc jamais de decision
-- silencieuse.

create or replace function public.admin_decide_participation(
  p_participation uuid,
  p_accept        boolean,
  p_reason        text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Reserve a l''administration.' using errcode = '42501';
  end if;

  update public.project_participants
     set status     = case when p_accept then 'accepte' else 'refuse' end::public.participation_status,
         decided_at = now(),
         decided_by = auth.uid(),
         message    = coalesce(p_reason, message)
   where id = p_participation;

  if not found then
    raise exception 'Demande d''adhesion introuvable.' using errcode = 'P0002';
  end if;

  insert into public.admin_actions (admin_id, action, entity_type, entity_id, details)
  values (auth.uid(),
          case when p_accept then 'adhesion_acceptee' else 'adhesion_refusee' end,
          'project_participants', p_participation,
          jsonb_build_object('reason', p_reason));
end;
$$;

-- Liste des demandes d'adhesion en attente, pour le back-office.
create or replace function public.admin_pending_participations()
returns table (
  id             uuid,
  project_id     uuid,
  project_title  text,
  project_ref    text,
  units_planned  integer,
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

-- -----------------------------------------------------------------------------
-- 7. Terrains eligibles a la creation d'un projet
-- -----------------------------------------------------------------------------

create or replace function public.admin_projectable_lands()
returns table (
  id          uuid,
  reference   text,
  title       text,
  region_name text,
  city_name   text,
  surface_m2  numeric,
  zoning      public.land_zoning,
  price_per_m2 numeric,
  total_price numeric,
  estimated_units integer,
  has_project boolean
)
language sql
security definer
set search_path = public
as $$
  select l.id,
         l.reference,
         l.title,
         r.name_fr,
         c.name_fr,
         l.surface_m2,
         l.zoning,
         l.price_per_m2,
         l.total_price,
         public.estimate_units(l.surface_m2, l.zoning, l.declared_units),
         exists (select 1 from public.projects p where p.land_id = l.id)
  from public.land_listings l
  join public.regions r on r.code = l.region_code
  left join public.cities c on c.id = l.city_id
  where l.status in ('valide', 'publie')
    and public.is_admin()
  order by l.created_at desc;
$$;

-- -----------------------------------------------------------------------------
-- 8. Regions effectivement couvertes
-- -----------------------------------------------------------------------------
-- « Regions couvertes » ne doit compter que les regions ou un projet existe
-- reellement, pas les 12 regions du referentiel.

create or replace function public.public_stats()
returns table (
  lands           bigint,
  projects        bigint,
  regions_covered bigint,
  units            bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.land_listings where status = 'publie'),
    (select count(*) from public.projects
      where status in ('ouvert', 'groupe_constitue', 'en_preparation', 'realise')),
    (select count(distinct region_code) from public.projects
      where status in ('ouvert', 'groupe_constitue', 'en_preparation', 'realise')),
    (select coalesce(sum(public.estimate_units(surface_m2, zoning, declared_units)), 0)
       from public.land_listings where status = 'publie');
$$;

-- -----------------------------------------------------------------------------
-- 9. Privileges
-- -----------------------------------------------------------------------------

revoke execute on function public.admin_create_project_from_land(
  uuid, text, integer, public.property_need, text, text,
  numeric, numeric, numeric, public.professional_body, boolean) from public;
revoke execute on function public.admin_set_project_pricing(uuid, integer, numeric, numeric, numeric) from public;
revoke execute on function public.admin_decide_participation(uuid, boolean, text) from public;
revoke execute on function public.admin_pending_participations() from public;
revoke execute on function public.admin_projectable_lands() from public;
revoke execute on function public.public_stats() from public;

grant execute on function public.admin_create_project_from_land(
  uuid, text, integer, public.property_need, text, text,
  numeric, numeric, numeric, public.professional_body, boolean) to authenticated;
grant execute on function public.admin_set_project_pricing(uuid, integer, numeric, numeric, numeric) to authenticated;
grant execute on function public.admin_decide_participation(uuid, boolean, text) to authenticated;
grant execute on function public.admin_pending_participations() to authenticated;
grant execute on function public.admin_projectable_lands() to authenticated;
grant execute on function public.public_stats() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 10. Rupture d'un cycle entre politiques RLS
-- -----------------------------------------------------------------------------
-- `projects` autorisait la lecture a un membre du groupe en interrogeant
-- `project_participants`, dont la propre politique interrogeait `projects` :
-- PostgreSQL detecte la boucle et refuse la requete
-- (« infinite recursion detected in policy »). Tout SELECT sur l'une des deux
-- tables par un compte authentifie echouait donc — la page « Mes projets »
-- comprise. On casse le cycle avec une fonction SECURITY DEFINER : elle
-- s'execute avec les droits du proprietaire, qui ne declenche pas la RLS, et la
-- politique n'a plus besoin de traverser l'autre table.

create or replace function public.is_project_member(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_participants
    where project_id = p_project
      and participant_id = auth.uid()
  );
$$;

comment on function public.is_project_member is
  'Appartenance a un groupe de projet, sans traverser la RLS — evite le cycle de politiques.';

drop policy if exists "projet : lecture" on public.projects;
create policy "projet : lecture" on public.projects
  for select using (
    status in ('ouvert', 'groupe_constitue', 'en_preparation', 'realise')
    or created_by = auth.uid()
    or public.is_admin()
    or public.is_project_member(projects.id)
  );

-- Cote participations, la branche « porteur du projet » n'a plus d'objet : le
-- porteur est desormais l'administration, deja couverte par is_admin().
drop policy if exists "participation : lecture" on public.project_participants;
create policy "participation : lecture" on public.project_participants
  for select using (participant_id = auth.uid() or public.is_admin());

drop policy if exists "participation : mise a jour" on public.project_participants;
create policy "participation : mise a jour" on public.project_participants
  for update using (participant_id = auth.uid() or public.is_admin())
  with check (participant_id = auth.uid() or public.is_admin());

revoke execute on function public.is_project_member(uuid) from public;
grant execute on function public.is_project_member(uuid) to anon, authenticated;
