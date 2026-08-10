-- =============================================================================
-- Ntcharkou — Migration 4/5 : KPI, statistiques et automatismes des projets
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Vie du groupe : candidatures, notifications, constitution automatique
-- -----------------------------------------------------------------------------

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

  -- Le porteur du projet est prevenu de chaque candidature.
  if tg_op = 'INSERT' and proj.created_by is not null and proj.created_by <> new.participant_id then
    insert into public.notifications (profile_id, kind, title, body, url, payload)
    values (
      proj.created_by,
      'candidature_recue',
      'Nouvelle candidature sur votre projet',
      format('Une candidature vient d''etre deposee sur « %s ».', proj.title),
      '/mes-projets/' || proj.id,
      jsonb_build_object('project_id', proj.id, 'participation_id', new.id)
    );
  end if;

  -- Le candidat est prevenu de la decision.
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'accepte' then
      insert into public.notifications (profile_id, kind, title, body, url, payload)
      values (new.participant_id, 'candidature_acceptee',
              'Votre candidature est acceptee',
              format('Vous rejoignez le projet « %s ».', proj.title),
              '/projets/' || proj.id,
              jsonb_build_object('project_id', proj.id));
    elsif new.status = 'refuse' then
      insert into public.notifications (profile_id, kind, title, body, url, payload)
      values (new.participant_id, 'candidature_refusee',
              'Votre candidature n''a pas ete retenue',
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

create trigger project_participants_lifecycle
  after insert or update on public.project_participants
  for each row execute function public.trg_project_participation();

-- Notification du proprietaire lors de la decision administrative sur un terrain.
create or replace function public.trg_land_status_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    if new.status = 'publie' then
      insert into public.notifications (profile_id, kind, title, body, url, payload)
      values (new.owner_id, 'terrain_valide',
              'Votre terrain est publie',
              format('« %s » est desormais visible par les participants.', new.title),
              '/terrains/' || new.id,
              jsonb_build_object('land_id', new.id));
    elsif new.status = 'refuse' then
      insert into public.notifications (profile_id, kind, title, body, url, payload)
      values (new.owner_id, 'terrain_refuse',
              'Votre terrain n''a pas ete valide',
              coalesce(new.rejection_reason, 'Consultez le detail de votre annonce.'),
              '/mes-terrains/' || new.id,
              jsonb_build_object('land_id', new.id));
    end if;
  end if;
  return new;
end;
$$;

create trigger land_listings_status_notification
  after update on public.land_listings
  for each row execute function public.trg_land_status_notification();

-- Ouverture d'un projet : les participants dont la demande colle sont prevenus.
create or replace function public.trg_project_opened_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status and new.status = 'ouvert' then
    insert into public.notifications (profile_id, kind, title, body, url, payload)
    select distinct r.participant_id, 'projet_ouvert'::public.notification_kind,
           'Un projet participatif correspond a votre demande',
           format('« %s » — %s unites, %s participants recherches.',
                  new.title, new.units_planned, new.participants_target),
           '/projets/' || new.id,
           jsonb_build_object('project_id', new.id)
    from public.participant_requests r
    where r.status = 'active'
      and (r.region_code is null or r.region_code = new.region_code)
      and (cardinality(r.property_needs) = 0 or new.property_need = any (r.property_needs))
      and (new.restricted_to_body is null
           or r.preferred_body is null
           or r.preferred_body = new.restricted_to_body);
  end if;
  return new;
end;
$$;

create trigger projects_opened_notification
  after update on public.projects
  for each row execute function public.trg_project_opened_notification();

-- -----------------------------------------------------------------------------
-- 2. Compteur de vues (appelable par un visiteur anonyme)
-- -----------------------------------------------------------------------------

create or replace function public.increment_land_views(p_land uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.land_listings
     set view_count = view_count + 1
   where id = p_land and status = 'publie';
$$;

grant execute on function public.increment_land_views(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. KPI du tableau de bord administrateur (section 15)
-- -----------------------------------------------------------------------------

create or replace function public.admin_kpis()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acces reserve a l''administration' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'terrains',            (select count(*) from public.land_listings where status = 'publie'),
    'terrains_en_attente', (select count(*) from public.land_listings
                             where status in ('soumis', 'en_verification')),
    'terrains_total',      (select count(*) from public.land_listings),
    'participants',        (select count(*) from public.profiles where role = 'participant'),
    'proprietaires',       (select count(*) from public.profiles where role = 'owner'),
    'demandes_actives',    (select count(*) from public.participant_requests where status = 'active'),
    'projets_valides',     (select count(*) from public.projects
                             where status in ('ouvert', 'groupe_constitue', 'en_preparation', 'realise')),
    'projets_en_attente',  (select count(*) from public.projects
                             where status in ('proposition', 'analyse', 'validation_admin')),
    'groupes_constitues',  (select count(*) from public.projects
                             where status in ('groupe_constitue', 'en_preparation', 'realise')),
    'matchings',           (select count(*) from public.matches),
    'matchings_pertinents',(select count(*) from public.matches
                             where score >= public.match_notify_score()),
    'score_moyen',         (select round(coalesce(avg(score), 0), 1) from public.matches),
    'signalements_ouverts',(select count(*) from public.reports where resolved_at is null),
    'taux_conversion',     (
       select case when count(*) = 0 then 0
              else round(count(*) filter (where status in ('interesse', 'converti'))::numeric
                         * 100 / count(*), 1)
              end
       from public.matches
    )
  ) into result;

  return result;
end;
$$;

-- Evolution des inscriptions (section 16)
create or replace function public.admin_signups_by_month(months integer default 12)
returns table (month date, participants bigint, proprietaires bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.month::date,
    count(*) filter (where p.role = 'participant')::bigint,
    count(*) filter (where p.role = 'owner')::bigint
  from generate_series(
         date_trunc('month', now()) - make_interval(months => greatest(months, 1) - 1),
         date_trunc('month', now()),
         interval '1 month'
       ) as m(month)
  left join public.profiles p
    on date_trunc('month', p.created_at) = m.month
   and public.is_admin()
  group by m.month
  order by m.month;
$$;

-- Terrains par region (section 16)
create or replace function public.admin_lands_by_region()
returns table (region_code text, region_name text, total bigint, published bigint)
language sql
stable
security definer
set search_path = public
as $$
  select r.code, r.name_fr,
         count(l.id)::bigint,
         count(l.id) filter (where l.status = 'publie')::bigint
  from public.regions r
  left join public.land_listings l on l.region_code = r.code
  where public.is_admin()
  group by r.code, r.name_fr, r.sort_order
  order by r.sort_order;
$$;

-- Demande par typologie (section 16)
create or replace function public.admin_requests_by_type()
returns table (property_need public.property_need, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select n.need, count(*)::bigint
  from public.participant_requests r
  cross join lateral unnest(r.property_needs) as n(need)
  where r.status = 'active' and public.is_admin()
  group by n.need
  order by 2 desc;
$$;

-- Distribution des budgets (section 16)
create or replace function public.admin_budget_distribution()
returns table (bucket text, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  with b as (
    select case
             when coalesce(budget_total_max, budget_per_unit_max * coalesce(units_wanted, 1)) < 500000
               then '< 500k'
             when coalesce(budget_total_max, budget_per_unit_max * coalesce(units_wanted, 1)) < 1000000
               then '500k - 1M'
             when coalesce(budget_total_max, budget_per_unit_max * coalesce(units_wanted, 1)) < 2000000
               then '1M - 2M'
             when coalesce(budget_total_max, budget_per_unit_max * coalesce(units_wanted, 1)) < 5000000
               then '2M - 5M'
             else '> 5M'
           end as bucket
    from public.participant_requests
    where status = 'active'
      and coalesce(budget_total_max, budget_per_unit_max * coalesce(units_wanted, 1)) is not null
  )
  select o.bucket, coalesce(count(b.bucket), 0)::bigint
  from (values ('< 500k', 1), ('500k - 1M', 2), ('1M - 2M', 3), ('2M - 5M', 4), ('> 5M', 5))
       as o(bucket, ord)
  left join b on b.bucket = o.bucket
  where public.is_admin()
  group by o.bucket, o.ord
  order by o.ord;
$$;

-- KPI metier terrains (section 17)
create or replace function public.admin_land_kpis()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acces reserve a l''administration' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'prix_moyen_m2',   round(coalesce(avg(price_per_m2), 0), 0),
    'surface_moyenne', round(coalesce(avg(surface_m2), 0), 0),
    'pct_eau',         round(coalesce(avg((has_water)::int), 0) * 100, 1),
    'pct_electricite', round(coalesce(avg((has_electricity)::int), 0) * 100, 1),
    'pct_assainissement', round(coalesce(avg((has_sewage)::int), 0) * 100, 1),
    'par_zonage', coalesce((
      select jsonb_object_agg(zoning, n)
      from (select zoning::text, count(*) as n
            from public.land_listings where status = 'publie'
            group by zoning) z
    ), '{}'::jsonb)
  ) into result
  from public.land_listings
  where status = 'publie';

  return result;
end;
$$;

-- KPI metier projets (section 17)
create or replace function public.admin_project_kpis()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acces reserve a l''administration' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'projets_ouverts',   count(*) filter (where status = 'ouvert'),
    'projets_complets',  count(*) filter (where status in ('groupe_constitue', 'en_preparation', 'realise')),
    'projets_annules',   count(*) filter (where status = 'annule'),
    'taux_abandon',      case when count(*) = 0 then 0
                              else round(count(*) filter (where status = 'annule')::numeric * 100 / count(*), 1)
                         end,
    'participants_moyen', coalesce((
        select round(avg(c), 1) from (
          select count(*) as c from public.project_participants
          where status = 'accepte' group by project_id
        ) t
      ), 0),
    'jours_pour_constituer', coalesce((
        select round(avg(extract(epoch from (
                 (select max(pp.decided_at) from public.project_participants pp
                   where pp.project_id = p.id and pp.status = 'accepte')
                 - p.opened_at)) / 86400), 1)
        from public.projects p
        where p.status in ('groupe_constitue', 'en_preparation', 'realise')
          and p.opened_at is not null
      ), 0)
  ) into result
  from public.projects;

  return result;
end;
$$;

-- KPI matching (section 17)
create or replace function public.admin_matching_kpis()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acces reserve a l''administration' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total',            count(*),
    'score_moyen',      round(coalesce(avg(score), 0), 1),
    'excellents',       count(*) filter (where score >= 90),
    'tres_bons',        count(*) filter (where score >= 75 and score < 90),
    'interessants',     count(*) filter (where score >= 60 and score < 75),
    'faibles',          count(*) filter (where score < 60),
    'notifies',         count(*) filter (where notified_at is not null),
    'vus',              count(*) filter (where viewed_at is not null),
    'interesses',       count(*) filter (where status = 'interesse'),
    'convertis',        count(*) filter (where status = 'converti'),
    'taux_ouverture',   case when count(*) filter (where notified_at is not null) = 0 then 0
                             else round(count(*) filter (where viewed_at is not null)::numeric * 100
                                        / count(*) filter (where notified_at is not null), 1)
                        end
  ) into result
  from public.matches;

  return result;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Actions administratives outillees (journalisees)
-- -----------------------------------------------------------------------------

create or replace function public.admin_review_land(
  p_land   uuid,
  p_status public.listing_status,
  p_reason text default null
)
returns public.land_listings
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.land_listings;
begin
  if not public.is_admin() then
    raise exception 'Acces reserve a l''administration' using errcode = '42501';
  end if;

  update public.land_listings
     set status = p_status,
         rejection_reason = case when p_status = 'refuse' then p_reason else null end
   where id = p_land
  returning * into updated;

  if not found then
    raise exception 'Terrain introuvable';
  end if;

  insert into public.admin_actions (admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'land.' || p_status::text, 'land_listing', p_land,
          jsonb_build_object('reason', p_reason));

  return updated;
end;
$$;

create or replace function public.admin_review_project(
  p_project uuid,
  p_status  public.project_status,
  p_reason  text default null
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.projects;
begin
  if not public.is_admin() then
    raise exception 'Acces reserve a l''administration' using errcode = '42501';
  end if;

  update public.projects
     set status = p_status,
         rejection_reason = case when p_status = 'annule' then p_reason else null end
   where id = p_project
  returning * into updated;

  if not found then
    raise exception 'Projet introuvable';
  end if;

  insert into public.admin_actions (admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'project.' || p_status::text, 'project', p_project,
          jsonb_build_object('reason', p_reason));

  return updated;
end;
$$;

create or replace function public.admin_set_user_suspended(p_profile uuid, p_suspended boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acces reserve a l''administration' using errcode = '42501';
  end if;

  update public.profiles set is_suspended = p_suspended where id = p_profile;

  insert into public.admin_actions (admin_id, action, entity_type, entity_id, details)
  values (auth.uid(),
          case when p_suspended then 'user.suspend' else 'user.restore' end,
          'profile', p_profile, '{}'::jsonb);
end;
$$;

-- Liste administrateur des utilisateurs (contourne la RLS de profiles apres
-- verification explicite du role).
create or replace function public.admin_list_users(
  p_search text default null,
  p_role   public.user_role default null,
  p_limit  integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid, role public.user_role, first_name text, last_name text,
  email text, phone text, region_code text, is_suspended boolean,
  created_at timestamptz, lands_count bigint, requests_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.role, p.first_name, p.last_name, p.email, p.phone,
         p.region_code, p.is_suspended, p.created_at,
         (select count(*) from public.land_listings l where l.owner_id = p.id)::bigint,
         (select count(*) from public.participant_requests r where r.participant_id = p.id)::bigint
  from public.profiles p
  where public.is_admin()
    and (p_role is null or p.role = p_role)
    and (
      p_search is null or p_search = ''
      or p.first_name ilike '%' || p_search || '%'
      or p.last_name  ilike '%' || p_search || '%'
      or p.email      ilike '%' || p_search || '%'
      or p.phone      ilike '%' || p_search || '%'
    )
  order by p.created_at desc
  limit greatest(p_limit, 1) offset greatest(p_offset, 0);
$$;

-- Vue administrateur du matching (section "Matching" du back-office)
create or replace function public.admin_recent_matches(p_limit integer default 50)
returns table (
  id uuid, score numeric, status public.match_status, created_at timestamptz,
  land_id uuid, land_title text, land_city text,
  request_id uuid, request_title text,
  participant_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.score, m.status, m.created_at,
         l.id, l.title, coalesce(c.name_fr, l.city_other),
         r.id, r.title,
         trim(p.first_name || ' ' || p.last_name)
  from public.matches m
  join public.land_listings l on l.id = m.land_id
  left join public.cities c on c.id = l.city_id
  join public.participant_requests r on r.id = m.request_id
  join public.profiles p on p.id = r.participant_id
  where public.is_admin()
  order by m.created_at desc
  limit greatest(p_limit, 1);
$$;
