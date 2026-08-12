-- =============================================================================
-- Ntcharkou — Migration 13 : contenu saisi en arabe
-- =============================================================================
-- Le referentiel (regions, villes) portait deja les deux graphies, mais pas le
-- contenu redige : titre d'un terrain, intitule et description d'un projet.
-- La version arabe du site affichait donc du francais au milieu de l'arabe.
--
-- Chaque champ redactionnel recoit son pendant `_ar`. Le champ d'origine reste
-- la version francaise et sert de repli : une annonce sans traduction demeure
-- lisible en arabe plutot que de disparaitre.
--
-- ⚠ Migration rejouable, mais dans l'ordre uniquement : elle recree les deux
--   vues publiques. Ne la rejouez pas apres une migration ulterieure.

-- -----------------------------------------------------------------------------
-- 1. Colonnes
-- -----------------------------------------------------------------------------

alter table public.land_listings
  add column if not exists title_ar        text,
  add column if not exists description_ar  text,
  add column if not exists observations_ar text;

alter table public.projects
  add column if not exists title_ar       text,
  add column if not exists summary_ar     text,
  add column if not exists description_ar text;

comment on column public.land_listings.title_ar is
  'Titre en arabe. Vide, le titre francais sert de repli.';
comment on column public.projects.title_ar is
  'Intitule en arabe. Vide, l''intitule francais sert de repli.';

-- -----------------------------------------------------------------------------
-- 2. Vue publique des terrains
-- -----------------------------------------------------------------------------
-- Les deux graphies sont publiees telles quelles ; c'est l'application qui
-- choisit selon la langue, comme elle le fait deja pour les noms de lieux.

-- Une version anterieure de `lands_in_bounds` renvoyait
-- `setof public.land_listings_public` : PostgreSQL en deduisait une dependance
-- sur le type de la vue, qui ne pouvait plus etre recreee (« cannot drop view
-- ... because other objects depend on it »). La fonction actuelle ne dependant
-- plus du type de la vue, ce `drop` ne vise que l'ancienne — et il est sans
-- effet sur une base ou elle n'a jamais existe. La migration 14 la recree.
drop function if exists public.lands_in_bounds(
  double precision, double precision, double precision, double precision, integer);

drop view if exists public.land_listings_public;

create view public.land_listings_public
with (security_invoker = on) as
  select
    l.id,
    l.reference,
    l.title,
    nullif(btrim(coalesce(l.title_ar, '')), '')        as title_ar,
    l.description,
    nullif(btrim(coalesce(l.description_ar, '')), '')  as description_ar,
    l.region_code,
    r.name_fr                          as region_name,
    coalesce(r.name_ar, r.name_fr)     as region_name_ar,
    l.city_id,
    coalesce(c.name_fr, l.city_other)  as city_name,
    coalesce(c.name_ar, c.name_fr, l.city_other) as city_name_ar,
    l.district,
    l.latitude,
    l.longitude,
    l.zoning,
    l.surface_m2,
    l.facade_m,
    l.depth_m,
    l.facade_count,
    l.road_width_m,
    l.legal_status,
    l.observations,
    nullif(btrim(coalesce(l.observations_ar, '')), '') as observations_ar,
    l.price_per_m2,
    l.total_price,
    l.price_negotiable,
    l.has_water,
    l.has_electricity,
    l.has_sewage,
    l.has_telecom,
    l.has_gas,
    l.network_other,
    public.estimate_units(l.surface_m2, l.zoning, l.declared_units) as estimated_units,
    l.status,
    l.published_at,
    l.created_at,
    l.view_count,
    (
      select li.storage_path from public.land_images li
      where li.land_id = l.id
      order by li.sort_order, li.created_at
      limit 1
    ) as cover_image_path,
    (select count(*) from public.land_images li where li.land_id = l.id) as image_count
  from public.land_listings l
  join public.regions r on r.code = l.region_code
  left join public.cities c on c.id = l.city_id;

grant select on public.land_listings_public to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Vue publique des projets
-- -----------------------------------------------------------------------------

drop view if exists public.projects_public;

create view public.projects_public
with (security_invoker = on) as
  select
    p.id,
    p.reference,
    p.title,
    nullif(btrim(coalesce(p.title_ar, '')), '')       as title_ar,
    p.summary,
    nullif(btrim(coalesce(p.summary_ar, '')), '')     as summary_ar,
    p.description,
    nullif(btrim(coalesce(p.description_ar, '')), '') as description_ar,
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
    (
      select count(*) from public.project_participants pp
      where pp.project_id = p.id and pp.status = 'accepte'
    ) as participants_confirmed,
    (
      select count(*) from public.project_participants pp
      where pp.project_id = p.id and pp.status = 'candidature'
    ) as participants_pending,
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
-- 4. Creation d'un projet : les deux graphies des le depart
-- -----------------------------------------------------------------------------

-- `create or replace` ne remplace pas une fonction dont la signature change :
-- il en cree une seconde, et l'appel devient ambigu (« is not unique »).
-- L'ancienne signature doit donc partir explicitement.
drop function if exists public.admin_create_project_from_land(
  uuid, text, integer, public.property_need, text, text,
  numeric, numeric, numeric, public.professional_body, boolean);

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
  p_open                boolean default true,
  p_title_ar            text default null,
  p_summary_ar          text default null,
  p_description_ar      text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  land   public.land_listings;
  new_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Reserve a l''administration.' using errcode = '42501';
  end if;

  select * into land from public.land_listings where id = p_land;
  if not found then
    raise exception 'Terrain introuvable.' using errcode = 'P0002';
  end if;

  if land.status not in ('valide', 'publie') then
    raise exception 'Le terrain doit etre valide avant d''ouvrir un projet.'
      using errcode = '22023';
  end if;

  if p_units_planned is null or p_units_planned <= 0 then
    raise exception 'Le nombre d''unites doit etre positif.' using errcode = '22023';
  end if;

  insert into public.projects (
    title, title_ar, summary, summary_ar, description, description_ar,
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
    p_title, p_title_ar, p_summary, p_summary_ar, p_description, p_description_ar,
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

revoke execute on function public.admin_create_project_from_land(
  uuid, text, integer, public.property_need, text, text,
  numeric, numeric, numeric, public.professional_body, boolean,
  text, text, text) from public;
grant execute on function public.admin_create_project_from_land(
  uuid, text, integer, public.property_need, text, text,
  numeric, numeric, numeric, public.professional_body, boolean,
  text, text, text) to authenticated;

-- Revision des textes d'un projet, independamment de la grille tarifaire.
create or replace function public.admin_set_project_texts(
  p_project        uuid,
  p_title          text,
  p_title_ar       text default null,
  p_summary        text default null,
  p_summary_ar     text default null,
  p_description    text default null,
  p_description_ar text default null
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

  if p_title is null or btrim(p_title) = '' then
    raise exception 'L''intitule est obligatoire.' using errcode = '22023';
  end if;

  update public.projects
     set title          = p_title,
         title_ar       = nullif(btrim(coalesce(p_title_ar, '')), ''),
         summary        = p_summary,
         summary_ar     = nullif(btrim(coalesce(p_summary_ar, '')), ''),
         description    = p_description,
         description_ar = nullif(btrim(coalesce(p_description_ar, '')), ''),
         updated_at     = now()
   where id = p_project;

  if not found then
    raise exception 'Projet introuvable.' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.admin_set_project_texts(uuid, text, text, text, text, text, text) from public;
grant execute on function public.admin_set_project_texts(uuid, text, text, text, text, text, text) to authenticated;
