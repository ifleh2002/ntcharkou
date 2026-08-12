-- =============================================================================
-- Ntcharkou — Migration 14 : parcelle cartographiee, zonages multiples,
--                            conversion automatique en projet
-- =============================================================================
-- Trois changements independants, reunis parce qu'ils touchent la meme table.
--
--   1. Zonages — un terrain releve souvent de plusieurs zonages a la fois. La
--      colonne `zoning` (une seule valeur) devient le zonage principal, et
--      `zonings` porte l'ensemble.
--
--   2. Carte — la parcelle est stockee comme un polygone PostGIS. Surface et
--      perimetre en decoulent, donc ne peuvent pas diverger du trace. Un statut
--      de marche distinct du statut de publication donne sa couleur au polygone.
--
--   3. Conversion — des qu'un participant manifeste son interet, le terrain
--      devient une proposition de projet. L'administration l'instruit, et c'est
--      sa validation qui l'ouvre aux adhesions.
--
-- ⚠ Rejouable, mais dans l'ordre uniquement : elle recree les vues publiques.

create extension if not exists postgis;

-- -----------------------------------------------------------------------------
-- 1. Zonages multiples
-- -----------------------------------------------------------------------------

alter table public.land_listings
  add column if not exists zonings public.land_zoning[];

comment on column public.land_listings.zonings is
  'Ensemble des zonages du terrain. `zoning` reste le zonage principal, utilise
   par l''estimation de capacite et par les filtres a valeur unique.';

-- Reprise des donnees existantes : le zonage principal devient le premier de
-- l''ensemble, pour qu''aucune annonce ne se retrouve sans zonage liste.
update public.land_listings
   set zonings = array[zoning]
 where zonings is null;

-- Le zonage principal doit toujours figurer dans l'ensemble : sans cette regle,
-- un terrain pourrait etre filtre sur un zonage qu'il n'affiche pas.
create or replace function public.trg_land_zonings()
returns trigger
language plpgsql
as $$
begin
  if new.zonings is null or cardinality(new.zonings) = 0 then
    new.zonings := array[new.zoning];
  elsif not (new.zoning = any(new.zonings)) then
    new.zonings := array_prepend(new.zoning, new.zonings);
  end if;
  return new;
end;
$$;

drop trigger if exists land_listings_zonings on public.land_listings;
create trigger land_listings_zonings
  before insert or update of zoning, zonings on public.land_listings
  for each row execute function public.trg_land_zonings();

-- -----------------------------------------------------------------------------
-- 2. Statut de marche : la couleur du polygone
-- -----------------------------------------------------------------------------
-- Distinct du statut de publication (`status`), qui decrit l'avancement du
-- dossier administratif. Un terrain publie peut etre disponible, en negociation
-- ou vendu — ce sont deux axes differents.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'land_market_status') then
    create type public.land_market_status as enum (
      'disponible',      -- vert
      'en_negociation',  -- orange
      'reserve',         -- bleu
      'vendu',           -- rouge
      'masque'           -- gris : a verifier, non diffuse
    );
  end if;
end;
$$;

alter table public.land_listings
  add column if not exists market_status public.land_market_status not null default 'disponible';

-- -----------------------------------------------------------------------------
-- 3. La parcelle
-- -----------------------------------------------------------------------------
-- SRID 4326 : coordonnees GPS (WGS 84), le format que produisent la carte et le
-- GeoJSON. Les mesures se font en projetant vers `geography`, sans quoi une
-- surface serait exprimee en degres — un nombre sans signification.

alter table public.land_listings
  add column if not exists parcel geometry(Polygon, 4326);

create index if not exists land_listings_parcel_gix
  on public.land_listings using gist (parcel);

comment on column public.land_listings.parcel is
  'Contour de la parcelle (WGS 84). Surface et perimetre en sont deduits.';

-- Surface et perimetre mesures sur le trace, en metres.
alter table public.land_listings
  add column if not exists parcel_area_m2 numeric(14, 2),
  add column if not exists parcel_perimeter_m numeric(12, 2);

create or replace function public.trg_land_parcel_metrics()
returns trigger
language plpgsql
as $$
begin
  if new.parcel is null then
    new.parcel_area_m2 := null;
    new.parcel_perimeter_m := null;
  else
    -- `geography` mesure sur l'ellipsoide : des metres, pas des degres.
    new.parcel_area_m2     := round(st_area(new.parcel::geography)::numeric, 2);
    new.parcel_perimeter_m := round(st_perimeter(new.parcel::geography)::numeric, 2);
  end if;
  return new;
end;
$$;

drop trigger if exists land_listings_parcel_metrics on public.land_listings;
create trigger land_listings_parcel_metrics
  before insert or update of parcel on public.land_listings
  for each row execute function public.trg_land_parcel_metrics();

-- -----------------------------------------------------------------------------
-- 4. Conversion d'un terrain en proposition de projet
-- -----------------------------------------------------------------------------
-- Le premier interet exprime cree la proposition ; les suivants ne creent rien
-- de plus, ils rejoignent la proposition existante. Le projet naissant est en
-- `proposition` : il n'est pas encore public, l'administration doit l'instruire
-- puis l'ouvrir, ce qui reste sa prerogative exclusive.

create or replace function public.convert_land_to_proposal(p_land uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  land public.land_listings;
  existing uuid;
  new_id uuid;
begin
  select * into land from public.land_listings where id = p_land;
  if not found then
    return null;
  end if;

  -- Un terrain ne porte qu'un projet : l'interet suivant rejoint celui-ci.
  select id into existing from public.projects where land_id = p_land limit 1;
  if existing is not null then
    return existing;
  end if;

  -- Seul un terrain diffusable devient une proposition ; un brouillon ou un
  -- dossier refuse n'a rien a faire dans la file d'instruction.
  if land.status not in ('valide', 'publie') then
    return null;
  end if;

  insert into public.projects (
    title, title_ar, summary,
    created_by, land_id,
    region_code, city_id, district,
    property_need, zoning,
    units_planned, participants_target,
    status
  )
  values (
    land.title,
    land.title_ar,
    'Proposition ouverte a la suite d''un interet exprime sur le terrain.',
    land.owner_id, land.id,
    land.region_code, land.city_id, land.district,
    public.default_need_for_zoning(land.zoning),
    land.zoning,
    greatest(coalesce(public.estimate_units(land.surface_m2, land.zoning, land.declared_units), 1), 1),
    greatest(coalesce(public.estimate_units(land.surface_m2, land.zoning, land.declared_units), 1), 1),
    'proposition'
  )
  returning id into new_id;

  -- L'administration est prevenue : sans cela, la proposition attendrait qu'on
  -- pense a regarder la file.
  insert into public.notifications (profile_id, kind, title, body, url, payload)
  select pr.id,
         'systeme'::public.notification_kind,
         'Nouveau projet a instruire',
         format('Un interet a ete exprime sur « %s » : une proposition de projet vient d''etre creee.',
                land.title),
         '/admin/projets',
         jsonb_build_object('project_id', new_id, 'land_id', land.id)
  from public.profiles pr
  where pr.role = 'admin' and not pr.is_suspended;

  return new_id;
end;
$$;

-- Typologie par defaut deduite du zonage : l'administration l'ajustera, mais la
-- proposition doit naitre avec une valeur coherente.
create or replace function public.default_need_for_zoning(p_zoning public.land_zoning)
returns public.property_need
language sql
immutable
as $$
  select case p_zoning
    when 'villa'        then 'terrain_villa'
    when 'lotissement'  then 'terrain_villa'
    when 'r2'           then 'terrain_r2'
    when 'r3'           then 'terrain_r3'
    when 'r4'           then 'terrain_r4'
    when 'immeuble'     then 'appartement_immeuble'
    when 'agricole'     then 'mini_ferme'
    when 'industriel'   then 'terrain_industriel'
    else 'appartement_immeuble'
  end::public.property_need;
$$;

-- Branchement sur l'expression d'interet.
-- L'interet ne passe pas par une table mais par `express_interest` : la
-- conversion s'y greffe donc directement, plutot que sur un declencheur. La
-- fonction est reecrite a l'identique, la creation de la proposition en plus.

create or replace function public.express_interest(p_land uuid, p_message text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  land       public.land_listings;
  interested uuid := auth.uid();
begin
  if interested is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;

  if not public.is_active_user() then
    raise exception 'Compte suspendu' using errcode = '42501';
  end if;

  select * into land from public.land_listings where id = p_land and status = 'publie';
  if not found then
    raise exception 'Terrain introuvable ou non publie';
  end if;

  if land.owner_id = interested then
    return;   -- pas de notification a soi-meme
  end if;

  update public.matches m
     set status = 'interesse', viewed_at = coalesce(m.viewed_at, now())
    from public.participant_requests r
   where m.request_id = r.id
     and m.land_id = p_land
     and r.participant_id = interested;

  insert into public.notifications (profile_id, kind, title, body, url, payload)
  values (
    land.owner_id,
    'nouveau_match_demande',
    'Un participant est interesse par votre terrain',
    coalesce(
      nullif(trim(p_message), ''),
      format('Une marque d''interet vient d''etre enregistree sur « %s ».', land.title)
    ),
    '/mes-terrains/' || land.id,
    jsonb_build_object('land_id', land.id)
  );

  -- Le premier interet transforme le terrain en proposition de projet.
  -- Les suivants retombent sur la proposition existante, sans rien creer.
  perform public.convert_land_to_proposal(p_land);
end;
$$;

grant execute on function public.express_interest(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Vue publique des terrains : zonages, parcelle, statut de marche
-- -----------------------------------------------------------------------------

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
    coalesce(l.zonings, array[l.zoning]) as zonings,
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
    l.market_status,
    -- La parcelle est publiee en GeoJSON : la carte la consomme telle quelle.
    case when l.parcel is not null then st_asgeojson(l.parcel)::jsonb end as parcel,
    l.parcel_area_m2,
    l.parcel_perimeter_m,
    -- Centre du polygone, pour poser un marqueur sans charger tout le contour.
    case when l.parcel is not null then st_y(st_centroid(l.parcel)) else l.latitude end  as map_lat,
    case when l.parcel is not null then st_x(st_centroid(l.parcel)) else l.longitude end as map_lng,
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
-- 6. Enregistrement d'une parcelle
-- -----------------------------------------------------------------------------
-- Le polygone arrive en GeoJSON depuis la carte. On le valide ici plutot que de
-- faire confiance au navigateur : un contour invalide (moins de trois sommets,
-- auto-intersection) casserait les mesures et les recherches spatiales.

create or replace function public.set_land_parcel(p_land uuid, p_geojson jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  geom geometry;
  owns boolean;
begin
  select (owner_id = auth.uid()) or public.is_admin() into owns
  from public.land_listings where id = p_land;

  if owns is null then
    raise exception 'Terrain introuvable.' using errcode = 'P0002';
  end if;
  if not owns then
    raise exception 'Ce terrain ne vous appartient pas.' using errcode = '42501';
  end if;

  if p_geojson is null then
    update public.land_listings set parcel = null where id = p_land;
    return;
  end if;

  geom := st_setsrid(st_geomfromgeojson(p_geojson::text), 4326);

  if geometrytype(geom) <> 'POLYGON' then
    raise exception 'Le trace doit etre un polygone.' using errcode = '22023';
  end if;
  if not st_isvalid(geom) then
    -- Un contour qui se croise se repare sans perdre l'intention du dessin.
    geom := st_makevalid(geom);
    if geometrytype(geom) <> 'POLYGON' then
      raise exception 'Le trace se recoupe et n''a pas pu etre corrige.'
        using errcode = '22023';
    end if;
  end if;

  update public.land_listings set parcel = geom where id = p_land;
end;
$$;

revoke execute on function public.set_land_parcel(uuid, jsonb) from public;
grant execute on function public.set_land_parcel(uuid, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- 7. Terrains d'une zone de carte
-- -----------------------------------------------------------------------------
-- La carte ne demande que ce qu'elle affiche : les terrains contenus dans le
-- rectangle visible. Sans cela, chaque deplacement rapatrierait tout le pays.

create or replace function public.lands_in_bounds(
  p_west  double precision,
  p_south double precision,
  p_east  double precision,
  p_north double precision,
  p_limit integer default 300
)
returns setof public.land_listings_public
language sql
stable
security definer
set search_path = public
as $$
  select v.*
  from public.land_listings_public v
  join public.land_listings l on l.id = v.id
  where v.status = 'publie'
    and v.market_status <> 'masque'
    and (
      (l.parcel is not null
        and l.parcel && st_makeenvelope(p_west, p_south, p_east, p_north, 4326))
      or (l.parcel is null
        and l.longitude between p_west and p_east
        and l.latitude  between p_south and p_north)
    )
  limit greatest(1, least(p_limit, 1000));
$$;

revoke execute on function public.lands_in_bounds(
  double precision, double precision, double precision, double precision, integer) from public;
grant execute on function public.lands_in_bounds(
  double precision, double precision, double precision, double precision, integer)
  to anon, authenticated;
