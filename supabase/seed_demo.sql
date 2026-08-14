-- =============================================================================
-- Ntcharkou — Jeu de demonstration : 40 comptes, 20 terrains, 15 projets ouverts
-- =============================================================================
-- Donnees destinees a etre supprimees. Tout y porte un marqueur :
--
--   · comptes    -> adresse en @demo.ntcharkou.local
--   · terrains   -> identifiant commencant par f1......
--   · projets    -> identifiant commencant par f2......
--
-- Suppression complete, en une commande — voir `supabase/seed_demo_clean.sql` :
--
--   delete from auth.users where email like '%@demo.ntcharkou.local';
--
-- La cascade des cles etrangeres emporte profils, terrains, projets, photos,
-- adhesions et notifications. Aucune donnee reelle n'est touchee, puisque rien
-- de reel ne porte ce marqueur.
--
-- Rejouable : les insertions sont en `on conflict do nothing`.
-- =============================================================================

begin;

set local client_min_messages = warning;

-- -----------------------------------------------------------------------------
-- 1. Quarante comptes
-- -----------------------------------------------------------------------------
-- 8 proprietaires et 32 participants. Les profils, `owner_profiles` et
-- `participant_profiles` sont crees par le declencheur `handle_new_user`.

create temporary table demo_people (
  idx        integer primary key,
  id         uuid,
  first_name text,
  last_name  text,
  role       text,
  body       public.professional_body,
  region     text
) on commit drop;

insert into demo_people (idx, id, first_name, last_name, role, body, region)
select
  i,
  ('f0000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  (array['Ahmed','Fatima','Youssef','Salma','Karim','Nadia','Omar','Leila',
         'Rachid','Amina','Hassan','Khadija','Mehdi','Sanaa','Anas','Imane',
         'Yassine','Houda','Said','Meryem'])[1 + (i % 20)],
  (array['Benali','Alaoui','Tazi','Idrissi','Bennani','Cherkaoui','Amrani',
         'Berrada','Saidi','Ouali'])[1 + (i % 10)],
  case when i <= 8 then 'owner' else 'participant' end,
  (array['medecin','pharmacien','enseignant','ingenieur','fonctionnaire',
         'entrepreneur','cadre','autre'])[1 + (i % 8)]::public.professional_body,
  (array['casablanca-settat','rabat-sale-kenitra','marrakech-safi','fes-meknes',
         'tanger-tetouan-al-hoceima','souss-massa','oriental',
         'beni-mellal-khenifra'])[1 + (i % 8)]
from generate_series(1, 40) as i;

insert into auth.users (id, email, raw_user_meta_data)
select p.id,
       format('demo%s@demo.ntcharkou.local', lpad(p.idx::text, 2, '0')),
       jsonb_build_object(
         'first_name', p.first_name,
         'last_name',  p.last_name,
         'role',       p.role,
         'phone',      '06' || lpad((10000000 + p.idx)::text, 8, '0')
       )
from demo_people p
on conflict (id) do nothing;

update public.profiles pr
   set region_code = p.region
  from demo_people p
 where pr.id = p.id;

update public.participant_profiles pp
   set professional_body = p.body
  from demo_people p
 where pp.profile_id = p.id;

-- -----------------------------------------------------------------------------
-- 2. Vingt terrains publies
-- -----------------------------------------------------------------------------
-- Repartis sur huit regions, avec des coordonnees proches du chef-lieu pour
-- qu'ils apparaissent sur la carte. Un terrain sur trois recoit un contour
-- trace, afin de montrer les deux rendus : polygone et marqueur.

create temporary table demo_lands (
  idx     integer primary key,
  id      uuid,
  owner   uuid,
  region  text,
  lat     numeric,
  lng     numeric,
  zoning  public.land_zoning,
  surface numeric,
  price   numeric,
  market  public.land_market_status
) on commit drop;

insert into demo_lands (idx, id, owner, region, lat, lng, zoning, surface, price, market)
select
  i,
  ('f1000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  (select id from demo_people where idx = 1 + (i % 8)),
  r.code,
  -- Dispersion autour du chef-lieu : quelques kilometres, de quoi distinguer
  -- les terrains sans les envoyer dans une autre region.
  r.latitude  + ((i % 7) - 3) * 0.035,
  r.longitude + ((i % 5) - 2) * 0.045,
  (array['r2','r3','r4','villa','lotissement','immeuble','agricole',
         'residentiel'])[1 + (i % 8)]::public.land_zoning,
  (array[600, 900, 1200, 1800, 2500, 3200, 4500, 6000,
         8000, 12000])[1 + (i % 10)],
  (array[900, 1400, 2200, 3000, 3800, 4600, 5400, 700, 1100, 2800])[1 + (i % 10)],
  (array['disponible','disponible','disponible','en_negociation',
         'reserve'])[1 + (i % 5)]::public.land_market_status
from generate_series(1, 20) as i
join lateral (
  select code, latitude, longitude
  from public.regions
  where latitude is not null
  order by sort_order
  offset (i % 8) limit 1
) as r on true;

insert into public.land_listings (
  id, owner_id, title, title_ar, description,
  region_code, city_id, district,
  latitude, longitude,
  zoning, zonings, surface_m2, price_per_m2, price_negotiable,
  has_water, has_electricity, has_sewage, has_telecom,
  legal_status, status, market_status, submitted_at, published_at
)
select
  d.id,
  d.owner,
  format('Terrain %s m² — %s', d.surface, r.name_fr),
  format('أرض %s م² — %s', d.surface, coalesce(r.name_ar, r.name_fr)),
  'Annonce de démonstration, destinée aux essais de la plateforme.',
  d.region,
  (select c.id from public.cities c
    where c.region_code = d.region order by c.is_major desc, c.name_fr limit 1),
  (array['Centre','Route principale','Zone nord','Extension sud',
         'Quartier résidentiel'])[1 + (d.idx % 5)],
  d.lat, d.lng,
  d.zoning,
  -- Un terrain sur quatre porte un second zonage : le cas multiple doit être
  -- représenté dans le jeu d'essai.
  case when d.idx % 4 = 0
    then array[d.zoning, 'commercial']::public.land_zoning[]
    else array[d.zoning]
  end,
  d.surface, d.price,
  (d.idx % 3 = 0),
  true, true, (d.idx % 2 = 0), (d.idx % 3 <> 0),
  (array['titre_foncier','titre_foncier','melkia','requisition'])[1 + (d.idx % 4)]::public.legal_status,
  'publie', d.market,
  now() - (d.idx || ' days')::interval,
  now() - (d.idx || ' days')::interval
from demo_lands d
join public.regions r on r.code = d.region
on conflict (id) do nothing;

-- Contour tracé pour un terrain sur trois : un carré approximatif centré sur le
-- point du terrain, dimensionné d'après sa surface.
update public.land_listings l
   set parcel = st_setsrid(
     st_makepolygon(st_makeline(array[
       st_makepoint(d.lng - c.half, d.lat - c.half),
       st_makepoint(d.lng + c.half, d.lat - c.half),
       st_makepoint(d.lng + c.half, d.lat + c.half),
       st_makepoint(d.lng - c.half, d.lat + c.half),
       st_makepoint(d.lng - c.half, d.lat - c.half)
     ])), 4326)
  from demo_lands d
  cross join lateral (
    -- Demi-cote en degres : sqrt(surface) metres, converti a ~111 320 m/degre.
    select sqrt(d.surface) / 2 / 111320.0 as half
  ) as c
 where l.id = d.id
   and d.idx % 3 = 0;

-- -----------------------------------------------------------------------------
-- 3. Quinze projets ouverts
-- -----------------------------------------------------------------------------
-- Adosses aux quinze premiers terrains, avec une grille tarifaire complete :
-- c'est elle qui alimente le comparatif « prix participatif / prix du marche ».

insert into public.projects (
  id, title, title_ar, summary,
  created_by, land_id,
  region_code, city_id, district,
  property_need, zoning,
  units_planned, participants_target,
  unit_surface_m2, unit_price_per_m2, market_price_per_m2, budget_per_unit,
  restricted_to_body,
  status, opened_at, reviewed_at
)
select
  ('f2000000-0000-4000-8000-' || lpad(d.idx::text, 12, '0'))::uuid,
  format('Résidence participative — %s', r.name_fr),
  format('إقامة تشاركية — %s', coalesce(r.name_ar, r.name_fr)),
  'Projet de démonstration, ouvert aux demandes d''adhésion.',
  (select id from demo_people where idx = 1 + (d.idx % 8)),
  d.id,
  d.region,
  (select c.id from public.cities c
    where c.region_code = d.region order by c.is_major desc, c.name_fr limit 1),
  'Centre',
  public.default_need_for_zoning(d.zoning),
  d.zoning,
  u.units, u.units,
  u.surface, u.participatory, u.market,
  round(u.surface * u.participatory, 2),
  case when d.idx % 5 = 0
    then (array['medecin','enseignant','ingenieur'])[1 + (d.idx % 3)]::public.professional_body
  end,
  'ouvert',
  now() - (d.idx || ' days')::interval,
  now() - (d.idx || ' days')::interval
from demo_lands d
join public.regions r on r.code = d.region
cross join lateral (
  select
    (array[8, 10, 12, 14, 16, 18, 20, 24])[1 + (d.idx % 8)]           as units,
    (array[70, 80, 90, 100, 110, 120])[1 + (d.idx % 6)]::numeric      as surface,
    (array[4500, 5000, 5500, 6000, 6500, 7000])[1 + (d.idx % 6)]::numeric as participatory,
    (array[6500, 7200, 8000, 8800, 9500, 10500])[1 + (d.idx % 6)]::numeric as market
) as u
where d.idx <= 15
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 4. Adhesions
-- -----------------------------------------------------------------------------
-- Chaque projet recoit quelques adhesions validees et une ou deux en attente :
-- sans cela, le back-office n'aurait rien a instruire et les compteurs
-- resteraient a zero.

insert into public.project_participants (project_id, participant_id, units_wanted, status, decided_at)
select
  p.id,
  part.id,
  1 + (part.idx % 2),
  case when part.idx % 4 = 0 then 'candidature' else 'accepte' end::public.participation_status,
  case when part.idx % 4 <> 0 then now() end
from public.projects p
join lateral (
  select id, idx from demo_people
  where role = 'participant'
    -- Repartition deterministe : chaque projet tire un groupe distinct.
    and idx % 15 = (('x' || substr(replace(p.id::text, '-', ''), 1, 8))::bit(32)::bigint % 15)
  limit 4
) as part on true
where p.id::text like 'f2000000%'
on conflict (project_id, participant_id) do nothing;

commit;

-- -----------------------------------------------------------------------------
-- Recapitulatif
-- -----------------------------------------------------------------------------

select 'comptes'  as jeu, count(*) from auth.users where email like '%@demo.ntcharkou.local'
union all
select 'terrains', count(*) from public.land_listings where id::text like 'f1000000%'
union all
select 'projets ouverts', count(*) from public.projects
  where id::text like 'f2000000%' and status = 'ouvert'
union all
select 'adhesions', count(*) from public.project_participants pp
  join public.projects p on p.id = pp.project_id where p.id::text like 'f2000000%';
