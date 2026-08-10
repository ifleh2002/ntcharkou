-- =============================================================================
-- Ntcharkou — Durcissement des droits d'exécution
--
-- PostgreSQL accorde EXECUTE à PUBLIC par défaut. Pour les fonctions
-- SECURITY DEFINER qui écrivent ou lisent au-delà du périmètre de l'appelant,
-- on retire ce droit explicitement : les déclencheurs, eux, s'exécutent avec
-- les privilèges du propriétaire et n'ont pas besoin de ce GRANT.
-- =============================================================================

revoke execute on function public.refresh_matches_for_land(uuid) from public;
revoke execute on function public.refresh_matches_for_request(uuid) from public;
revoke execute on function public.rebuild_all_matches() from public;
revoke execute on function public.admin_review_land(uuid, public.listing_status, text) from public;
revoke execute on function public.admin_review_project(uuid, public.project_status, text) from public;
revoke execute on function public.admin_set_user_suspended(uuid, boolean) from public;
revoke execute on function public.admin_list_users(text, public.user_role, integer, integer) from public;
revoke execute on function public.admin_recent_matches(integer) from public;
revoke execute on function public.admin_kpis() from public;
revoke execute on function public.admin_land_kpis() from public;
revoke execute on function public.admin_project_kpis() from public;
revoke execute on function public.admin_matching_kpis() from public;

-- Les fonctions d'administration restent appelables par un utilisateur connecté :
-- elles vérifient elles-mêmes `is_admin()` et lèvent une erreur sinon.
grant execute on function public.admin_review_land(uuid, public.listing_status, text) to authenticated;
grant execute on function public.admin_review_project(uuid, public.project_status, text) to authenticated;
grant execute on function public.admin_set_user_suspended(uuid, boolean) to authenticated;
grant execute on function public.admin_list_users(text, public.user_role, integer, integer) to authenticated;
grant execute on function public.admin_recent_matches(integer) to authenticated;
grant execute on function public.admin_kpis() to authenticated;
grant execute on function public.admin_land_kpis() to authenticated;
grant execute on function public.admin_project_kpis() to authenticated;
grant execute on function public.admin_matching_kpis() to authenticated;

-- Recalcul global : administration uniquement.
create or replace function public.rebuild_all_matches()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  land_id uuid;
  total   integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Acces reserve a l''administration' using errcode = '42501';
  end if;

  for land_id in select id from public.land_listings where status = 'publie' loop
    total := total + public.refresh_matches_for_land(land_id);
  end loop;
  return total;
end;
$$;

revoke execute on function public.rebuild_all_matches() from public;
grant execute on function public.rebuild_all_matches() to authenticated;

-- Prévisualisation : réservée au propriétaire de la demande (et à l'administration).
create or replace function public.preview_matches_for_request(p_request uuid)
returns table (land_id uuid, score numeric, breakdown jsonb)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  req    public.participant_requests;
  land   public.land_listings;
  result jsonb;
begin
  select * into req from public.participant_requests where id = p_request;
  if not found then
    return;
  end if;

  if req.participant_id <> auth.uid() and not public.is_admin() then
    raise exception 'Acces refuse' using errcode = '42501';
  end if;

  for land in select * from public.land_listings where status = 'publie' loop
    result := public.match_score(req, land);
    if (result ->> 'score')::numeric >= public.match_min_score() then
      land_id   := land.id;
      score     := (result ->> 'score')::numeric;
      breakdown := result -> 'criteria';
      return next;
    end if;
  end loop;
end;
$$;

-- Traitement d'un signalement.
create or replace function public.admin_resolve_report(p_report uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acces reserve a l''administration' using errcode = '42501';
  end if;

  update public.reports
     set resolved_at = now(), resolved_by = auth.uid()
   where id = p_report;

  insert into public.admin_actions (admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'report.resolve', 'report', p_report, '{}'::jsonb);
end;
$$;

revoke execute on function public.admin_resolve_report(uuid) from public;
grant execute on function public.admin_resolve_report(uuid) to authenticated;

-- Liste administrateur des demandes (jointure profil, hors périmètre RLS).
create or replace function public.admin_list_requests(p_limit integer default 100)
returns table (
  id uuid, reference text, title text, status public.request_status,
  created_at timestamptz, units_wanted integer,
  budget_total_max numeric, region_name text, city_name text,
  participant_name text, match_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.reference, r.title, r.status, r.created_at, r.units_wanted,
         r.budget_total_max, reg.name_fr, c.name_fr,
         trim(p.first_name || ' ' || p.last_name),
         (select count(*) from public.matches m where m.request_id = r.id)::bigint
  from public.participant_requests r
  join public.profiles p on p.id = r.participant_id
  left join public.regions reg on reg.code = r.region_code
  left join public.cities c on c.id = r.city_id
  where public.is_admin()
  order by r.created_at desc
  limit greatest(p_limit, 1);
$$;

revoke execute on function public.admin_list_requests(integer) from public;
grant execute on function public.admin_list_requests(integer) to authenticated;
