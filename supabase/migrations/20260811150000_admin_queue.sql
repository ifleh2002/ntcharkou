-- =============================================================================
-- Ntcharkou — Migration 16 : file d'action et completude du back-office
-- =============================================================================
-- Le tableau de bord montrait des chiffres, mais ne disait pas quoi faire. Deux
-- fonctions y remedient :
--
--   1. `admin_action_queue()` — ce qui attend une decision, avec l'anciennete
--      de la plus vieille piece. Un dossier oublie depuis trois semaines ne se
--      distingue pas d'un dossier arrive ce matin dans un simple compteur.
--
--   2. `admin_completeness()` — ce qui est publie mais incomplet : un projet
--      sans grille tarifaire n'affiche aucun prix, un terrain sans contour
--      n'apparait pas sur la carte, un contenu sans version arabe s'affiche en
--      francais. Rien de tout cela ne remonte comme une erreur ; il faut donc
--      le chercher, ou l'afficher.
--
-- Rejouable.

create or replace function public.admin_action_queue()
returns table (
  kind        text,
  total       bigint,
  oldest_days integer
)
language sql
stable
security definer
set search_path = public
as $$
  select 'terrains_a_valider',
         count(*),
         coalesce(max(extract(day from now() - coalesce(submitted_at, created_at)))::integer, 0)
    from public.land_listings
   where status in ('soumis', 'en_verification') and public.is_admin()
  union all
  select 'projets_a_instruire',
         count(*),
         coalesce(max(extract(day from now() - created_at))::integer, 0)
    from public.projects
   where status in ('proposition', 'analyse', 'validation_admin') and public.is_admin()
  union all
  select 'adhesions_en_attente',
         count(*),
         coalesce(max(extract(day from now() - created_at))::integer, 0)
    from public.project_participants
   where status = 'candidature' and public.is_admin()
  union all
  select 'signalements_ouverts',
         count(*),
         coalesce(max(extract(day from now() - created_at))::integer, 0)
    from public.reports
   where resolved_at is null and public.is_admin();
$$;

create or replace function public.admin_completeness()
returns table (
  kind  text,
  total bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select 'terrains_sans_contour', count(*)
    from public.land_listings
   where status = 'publie' and parcel is null and public.is_admin()
  union all
  select 'terrains_sans_photo', count(*)
    from public.land_listings l
   where l.status = 'publie' and public.is_admin()
     and not exists (select 1 from public.land_images i where i.land_id = l.id)
  union all
  select 'projets_sans_grille', count(*)
    from public.projects
   where status = 'ouvert' and unit_price is null and public.is_admin()
  union all
  select 'contenus_sans_arabe', count(*)
    from public.projects
   where status = 'ouvert' and title_ar is null and public.is_admin();
$$;

revoke execute on function public.admin_action_queue() from public;
revoke execute on function public.admin_completeness() from public;
grant execute on function public.admin_action_queue() to authenticated;
grant execute on function public.admin_completeness() to authenticated;
