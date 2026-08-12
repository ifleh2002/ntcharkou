-- =============================================================================
-- Parcelle cartographiée, zonages multiples, conversion sur intérêt.
--   psql -d ntcharkou_test -f supabase/tests/03_geo_conversion.sql
-- =============================================================================

begin;
set local client_min_messages = warning;

insert into auth.users (id, email, raw_user_meta_data) values
  ('c1111111-1111-1111-1111-111111111111', 'geo-proprio@test.ma',
   '{"first_name":"Rachid","last_name":"Alaoui","role":"owner"}'),
  ('c2222222-2222-2222-2222-222222222222', 'geo-part@test.ma',
   '{"first_name":"Nawal","last_name":"Saidi","role":"participant"}'),
  ('c3333333-3333-3333-3333-333333333333', 'geo-part2@test.ma',
   '{"first_name":"Hamid","last_name":"Berrada","role":"participant"}'),
  ('c4444444-4444-4444-4444-444444444444', 'geo-admin@test.ma',
   '{"first_name":"Sanaa","last_name":"Ouali","role":"participant"}');

update public.profiles set role = 'admin' where id = 'c4444444-4444-4444-4444-444444444444';

insert into public.land_listings
  (id, owner_id, title, region_code, city_id, zoning, surface_m2, price_per_m2, status, published_at)
values
  ('d1111111-1111-1111-1111-111111111111',
   'c1111111-1111-1111-1111-111111111111',
   'Terrain cartographie', 'casablanca-settat',
   (select id from public.cities where region_code = 'casablanca-settat' limit 1),
   'r4', 5000, 700, 'publie', now());

-- --- Zonages multiples -------------------------------------------------------
do $$
declare
  z public.land_zoning[];
begin
  -- Sans saisie, l'ensemble contient au moins le zonage principal : un terrain
  -- ne doit jamais être introuvable via un filtre sur son propre zonage.
  select zonings into z from public.land_listings where id = 'd1111111-1111-1111-1111-111111111111';
  if z is null or not ('r4' = any(z)) then
    raise exception 'L''ensemble des zonages doit contenir le zonage principal';
  end if;

  update public.land_listings
     set zonings = array['immeuble', 'commercial']::public.land_zoning[]
   where id = 'd1111111-1111-1111-1111-111111111111';

  select zonings into z from public.land_listings where id = 'd1111111-1111-1111-1111-111111111111';
  if not ('r4' = any(z)) then
    raise exception 'Le zonage principal doit être réintroduit dans l''ensemble';
  end if;
  if cardinality(z) <> 3 then
    raise exception 'Trois zonages attendus, obtenu %', cardinality(z);
  end if;
end;
$$;

-- --- Parcelle : surface et périmètre déduits du tracé ------------------------
select set_config('request.jwt.claim.sub', 'c1111111-1111-1111-1111-111111111111', true);

do $$
declare
  aire numeric;
  perimetre numeric;
begin
  -- Rectangle d'environ 100 m sur 100 m près de Casablanca.
  perform public.set_land_parcel(
    'd1111111-1111-1111-1111-111111111111',
    '{"type":"Polygon","coordinates":[[
        [-7.6298, 33.5731],
        [-7.62872, 33.5731],
        [-7.62872, 33.57400],
        [-7.6298, 33.57400],
        [-7.6298, 33.5731]
      ]]}'::jsonb);

  select parcel_area_m2, parcel_perimeter_m into aire, perimetre
  from public.land_listings where id = 'd1111111-1111-1111-1111-111111111111';

  -- Mesure sur l'ellipsoïde : des mètres, pas des degrés. Un calcul en degrés
  -- donnerait un nombre minuscule et silencieusement faux.
  if aire is null or aire < 8000 or aire > 12000 then
    raise exception 'Surface hors de l''ordre de grandeur attendu (~10 000 m²) : %', aire;
  end if;
  if perimetre is null or perimetre < 350 or perimetre > 450 then
    raise exception 'Périmètre hors de l''ordre de grandeur attendu (~400 m) : %', perimetre;
  end if;
end;
$$;

-- --- Un tracé qui n'est pas un polygone est refusé --------------------------
do $$
begin
  begin
    perform public.set_land_parcel(
      'd1111111-1111-1111-1111-111111111111',
      '{"type":"Point","coordinates":[-7.6298, 33.5731]}'::jsonb);
    raise exception 'Un point ne doit pas être accepté comme parcelle';
  exception when others then
    if sqlstate <> '22023' then raise; end if;
  end;
end;
$$;

-- --- La parcelle est publiée en GeoJSON, avec son centre --------------------
do $$
declare
  v record;
begin
  select parcel, map_lat, map_lng into v
  from public.land_listings_public where id = 'd1111111-1111-1111-1111-111111111111';

  if v.parcel is null or v.parcel->>'type' <> 'Polygon' then
    raise exception 'La vue doit publier la parcelle en GeoJSON';
  end if;
  if v.map_lat is null or v.map_lng is null then
    raise exception 'Le centre du polygone doit être exposé pour le marqueur';
  end if;
  if v.map_lat < 33.5 or v.map_lat > 33.6 then
    raise exception 'Centre hors de la parcelle : %', v.map_lat;
  end if;
end;
$$;

-- --- Recherche par emprise de carte -----------------------------------------
select set_config('request.jwt.claim.sub', '', true);

do $$
begin
  if not exists (
    select 1 from public.lands_in_bounds(-7.65, 33.55, -7.60, 33.60)
    where id = 'd1111111-1111-1111-1111-111111111111'
  ) then
    raise exception 'Le terrain doit apparaître dans l''emprise qui le contient';
  end if;

  if exists (
    select 1 from public.lands_in_bounds(-5.0, 30.0, -4.9, 30.1)
    where id = 'd1111111-1111-1111-1111-111111111111'
  ) then
    raise exception 'Un terrain hors emprise ne doit pas remonter';
  end if;
end;
$$;

-- --- Un terrain masqué ne s'affiche pas sur la carte ------------------------
do $$
begin
  update public.land_listings set market_status = 'masque'
   where id = 'd1111111-1111-1111-1111-111111111111';

  if exists (
    select 1 from public.lands_in_bounds(-7.65, 33.55, -7.60, 33.60)
    where id = 'd1111111-1111-1111-1111-111111111111'
  ) then
    raise exception 'Un terrain masqué ne doit pas figurer sur la carte';
  end if;

  update public.land_listings set market_status = 'disponible'
   where id = 'd1111111-1111-1111-1111-111111111111';
end;
$$;

-- --- Le premier intérêt convertit le terrain en proposition -----------------
select set_config('request.jwt.claim.sub', 'c2222222-2222-2222-2222-222222222222', true);

do $$
declare
  proj public.projects;
begin
  if exists (select 1 from public.projects where land_id = 'd1111111-1111-1111-1111-111111111111') then
    raise exception 'Aucun projet ne doit exister avant le premier intérêt';
  end if;

  perform public.express_interest('d1111111-1111-1111-1111-111111111111', 'Ce terrain m''intéresse.');

  select * into proj from public.projects where land_id = 'd1111111-1111-1111-1111-111111111111';
  if not found then
    raise exception 'Le premier intérêt doit créer une proposition de projet';
  end if;

  -- Elle n'est pas encore publique : l'ouverture reste une décision
  -- administrative, elle ne peut pas découler d'un simple clic.
  if proj.status <> 'proposition' then
    raise exception 'La proposition doit naître en « proposition », obtenu %', proj.status;
  end if;
  if proj.units_planned < 1 then
    raise exception 'Le nombre d''unités doit être estimé depuis le terrain';
  end if;

  -- L'administration est prévenue, sinon la proposition attendrait qu'on
  -- pense à consulter la file.
  if not exists (
    select 1 from public.notifications
    where profile_id = 'c4444444-4444-4444-4444-444444444444'
      and payload->>'land_id' = 'd1111111-1111-1111-1111-111111111111'
  ) then
    raise exception 'L''administration doit être notifiée de la proposition';
  end if;
end;
$$;

-- --- Un second intérêt ne crée pas de doublon -------------------------------
select set_config('request.jwt.claim.sub', 'c3333333-3333-3333-3333-333333333333', true);

do $$
declare
  n integer;
begin
  perform public.express_interest('d1111111-1111-1111-1111-111111111111');

  select count(*) into n from public.projects
   where land_id = 'd1111111-1111-1111-1111-111111111111';
  if n <> 1 then
    raise exception 'Un terrain ne porte qu''une proposition, trouvé %', n;
  end if;
end;
$$;

-- --- La proposition n'apparaît publiquement qu'après validation -------------
do $$
declare
  proj uuid;
begin
  select id into proj from public.projects
   where land_id = 'd1111111-1111-1111-1111-111111111111';

  if exists (select 1 from public.projects_public where id = proj and status = 'ouvert') then
    raise exception 'Une proposition non validée ne doit pas être ouverte';
  end if;

  -- L'administration l'ouvre : c'est ce geste qui la rend publique.
  perform set_config('request.jwt.claim.sub', 'c4444444-4444-4444-4444-444444444444', true);
  perform public.admin_review_project(proj, 'ouvert');

  if (select status from public.projects where id = proj) <> 'ouvert' then
    raise exception 'La validation administrative doit ouvrir le projet';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '', true);
commit;

\echo '=== Carte et conversion : contrôles passés ==='
