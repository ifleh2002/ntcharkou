-- =============================================================================
-- Ntcharkou — Migration 2/5 : moteur de matching
--
-- Le calcul vit dans la base, pas dans le frontend : les deux sens du matching
-- (nouveau terrain -> demandes compatibles, nouvelle demande -> terrains
-- disponibles) partagent ainsi exactement la meme formule, et le resultat est
-- ecrit dans la meme transaction que la donnee qui l'a declenche.
--
-- Ponderation (section 22) :
--   Region 20 | Ville 15 | Type de projet 20 | Zonage 15 | Budget 15
--   Nombre d'unites 10 | Reseaux 5   => 100
-- =============================================================================

-- Seuils partages
create or replace function public.match_min_score() returns numeric
  language sql immutable as $$ select 40::numeric $$;

create or replace function public.match_notify_score() returns numeric
  language sql immutable as $$ select 60::numeric $$;

-- -----------------------------------------------------------------------------
-- Correspondance typologie <-> zonage
-- -----------------------------------------------------------------------------

create or replace function public.zoning_for_need(need public.property_need)
returns public.land_zoning[]
language sql
immutable
as $$
  select case need
    when 'appartement_immeuble'         then array['immeuble','r4','r3','r2']::public.land_zoning[]
    when 'appartement_r2'               then array['r2','residentiel']::public.land_zoning[]
    when 'appartement_residence_fermee' then array['immeuble','lotissement','residentiel']::public.land_zoning[]
    when 'terrain_r2'                   then array['r2','residentiel','lotissement']::public.land_zoning[]
    when 'terrain_r3'                   then array['r3','lotissement']::public.land_zoning[]
    when 'terrain_r4'                   then array['r4']::public.land_zoning[]
    when 'terrain_villa'                then array['villa','lotissement','residentiel']::public.land_zoning[]
    when 'mini_ferme'                   then array['agricole']::public.land_zoning[]
    when 'villa_semi_finie'             then array['villa']::public.land_zoning[]
    when 'terrain_industriel'           then array['industriel']::public.land_zoning[]
    else '{}'::public.land_zoning[]
  end;
$$;

create or replace function public.needs_for_zoning(z public.land_zoning)
returns public.property_need[]
language sql
immutable
as $$
  select case z
    when 'residentiel'  then array['appartement_r2','terrain_r2','terrain_villa','appartement_residence_fermee']::public.property_need[]
    when 'r2'           then array['appartement_r2','terrain_r2','appartement_immeuble']::public.property_need[]
    when 'r3'           then array['terrain_r3','appartement_immeuble']::public.property_need[]
    when 'r4'           then array['terrain_r4','appartement_immeuble']::public.property_need[]
    when 'villa'        then array['terrain_villa','villa_semi_finie']::public.property_need[]
    when 'lotissement'  then array['terrain_villa','terrain_r2','terrain_r3','appartement_residence_fermee']::public.property_need[]
    when 'immeuble'     then array['appartement_immeuble','appartement_residence_fermee']::public.property_need[]
    when 'industriel'   then array['terrain_industriel']::public.property_need[]
    when 'agricole'     then array['mini_ferme']::public.property_need[]
    else '{}'::public.property_need[]
  end;
$$;

-- Zonages consideres comme proches : un terrain R+3 reste pertinent pour qui
-- cherche du R+4, la note est simplement degradee.
create or replace function public.zoning_is_adjacent(a public.land_zoning, b public.land_zoning)
returns boolean
language sql
immutable
as $$
  select a = b
      or (a = any (array['r2','r3','r4','immeuble','residentiel']::public.land_zoning[])
      and b = any (array['r2','r3','r4','immeuble','residentiel']::public.land_zoning[]));
$$;

-- -----------------------------------------------------------------------------
-- Capacite estimee d'un terrain (nombre de logements realisables)
-- -----------------------------------------------------------------------------

create or replace function public.estimate_units(
  surface   numeric,
  zoning    public.land_zoning,
  declared  integer default null
)
returns integer
language plpgsql
immutable
as $$
declare
  floors      integer;
  buildable   numeric;
  avg_unit_m2 constant numeric := 85;   -- surface moyenne d'un logement
  footprint   constant numeric := 0.60; -- emprise au sol retenue
begin
  if declared is not null then
    return declared;
  end if;
  if surface is null or surface <= 0 then
    return null;
  end if;

  -- Typologies "une parcelle = une unite"
  if zoning in ('villa', 'lotissement') then
    return greatest(1, floor(surface / 250)::integer);
  elsif zoning = 'agricole' then
    return greatest(1, floor(surface / 1000)::integer);
  elsif zoning in ('commercial', 'industriel', 'autre') then
    return greatest(1, floor(surface / 500)::integer);
  end if;

  floors := case zoning
              when 'r2'          then 3
              when 'r3'          then 4
              when 'r4'          then 5
              when 'immeuble'    then 5
              when 'residentiel' then 2
              else 1
            end;

  buildable := surface * footprint * floors;
  return greatest(1, floor(buildable / avg_unit_m2)::integer);
end;
$$;

comment on function public.estimate_units is
  'Capacite indicative en logements : emprise 60%, 85 m2 par logement. La valeur
   declaree par le proprietaire prime toujours sur l''estimation.';

-- -----------------------------------------------------------------------------
-- Calcul du score de compatibilite demande <-> terrain
-- -----------------------------------------------------------------------------

create or replace function public.match_score(
  req  public.participant_requests,
  land public.land_listings
)
returns jsonb
language plpgsql
stable
as $$
declare
  s_region   numeric := 0;
  s_city     numeric := 0;
  s_type     numeric := 0;
  s_zoning   numeric := 0;
  s_budget   numeric := 0;
  s_units    numeric := 0;
  s_network  numeric := 0;

  wanted_zonings public.land_zoning[] := '{}';
  need           public.property_need;

  envelope_min numeric;
  envelope_max numeric;
  price        numeric;
  overrun      numeric;

  capacity  integer;
  ratio     numeric;

  required_total   integer := 0;
  required_present integer := 0;
  available        integer := 0;

  total numeric;
begin
  -- --- Region (20) : region non renseignee = "indifferent"
  if req.region_code is null then
    s_region := 1;
  elsif req.region_code = land.region_code then
    s_region := 1;
  else
    s_region := 0;
  end if;

  -- --- Ville (15)
  if req.city_id is null then
    s_city := 1;
  elsif land.city_id is not null and req.city_id = land.city_id then
    s_city := 1;
  elsif req.region_code is not null and req.region_code = land.region_code then
    s_city := 0.4;   -- meme region, autre ville
  else
    s_city := 0;
  end if;

  -- --- Type de projet (20) et zonage (15)
  if req.property_needs is null or cardinality(req.property_needs) = 0 then
    s_type   := 1;
    s_zoning := 1;
  else
    foreach need in array req.property_needs loop
      wanted_zonings := wanted_zonings || public.zoning_for_need(need);
    end loop;

    if req.property_needs && public.needs_for_zoning(land.zoning) then
      s_type := 1;
    elsif exists (
      select 1 from unnest(wanted_zonings) z
      where public.zoning_is_adjacent(z, land.zoning)
    ) then
      s_type := 0.5;
    else
      s_type := 0;
    end if;

    if land.zoning = any (wanted_zonings) then
      s_zoning := 1;
    elsif exists (
      select 1 from unnest(wanted_zonings) z
      where public.zoning_is_adjacent(z, land.zoning)
    ) then
      s_zoning := 0.6;
    else
      s_zoning := 0;
    end if;
  end if;

  -- --- Budget (15)
  price := land.total_price;

  envelope_min := coalesce(
    req.budget_total_min,
    req.budget_per_unit_min * nullif(req.units_wanted, 0)
  );
  envelope_max := coalesce(
    req.budget_total_max,
    req.budget_per_unit_max * nullif(req.units_wanted, 0)
  );

  if price is null or price = 0 then
    s_budget := 0.5;                       -- prix non communique
  elsif envelope_max is null and envelope_min is null then
    s_budget := 1;                         -- budget non renseigne = indifferent
  elsif envelope_max is not null and price > envelope_max then
    overrun  := (price - envelope_max) / envelope_max;
    s_budget := greatest(0, 1 - overrun * 3);   -- +10% => 0.70 ; +33% => 0
  elsif envelope_min is not null and price < envelope_min then
    s_budget := 0.9;                       -- sous le budget : penalite symbolique
  else
    s_budget := 1;
  end if;

  -- --- Nombre d'unites (10)
  capacity := public.estimate_units(land.surface_m2, land.zoning, land.declared_units);

  if req.units_wanted is null or capacity is null then
    s_units := 1;
  else
    ratio := least(capacity, req.units_wanted)::numeric
             / greatest(capacity, req.units_wanted)::numeric;
    if capacity >= req.units_wanted then
      s_units := greatest(ratio, 0.8);     -- capacite excedentaire : peu penalisant
    else
      s_units := ratio;
    end if;
  end if;

  -- --- Reseaux (5)
  if req.requires_water then
    required_total := required_total + 1;
    if land.has_water then required_present := required_present + 1; end if;
  end if;
  if req.requires_electricity then
    required_total := required_total + 1;
    if land.has_electricity then required_present := required_present + 1; end if;
  end if;
  if req.requires_sewage then
    required_total := required_total + 1;
    if land.has_sewage then required_present := required_present + 1; end if;
  end if;

  if required_total > 0 then
    s_network := required_present::numeric / required_total::numeric;
  else
    available := (land.has_water)::int + (land.has_electricity)::int + (land.has_sewage)::int;
    s_network := available::numeric / 3;
  end if;

  total := s_region * 20 + s_city * 15 + s_type * 20 + s_zoning * 15
         + s_budget * 15 + s_units * 10 + s_network * 5;

  return jsonb_build_object(
    'score', round(total, 2),
    'criteria', jsonb_build_object(
      'region',   jsonb_build_object('weight', 20, 'score', round(s_region, 3),  'points', round(s_region * 20, 2)),
      'ville',    jsonb_build_object('weight', 15, 'score', round(s_city, 3),    'points', round(s_city * 15, 2)),
      'type',     jsonb_build_object('weight', 20, 'score', round(s_type, 3),    'points', round(s_type * 20, 2)),
      'zonage',   jsonb_build_object('weight', 15, 'score', round(s_zoning, 3),  'points', round(s_zoning * 15, 2)),
      'budget',   jsonb_build_object('weight', 15, 'score', round(s_budget, 3),  'points', round(s_budget * 15, 2)),
      'unites',   jsonb_build_object('weight', 10, 'score', round(s_units, 3),   'points', round(s_units * 10, 2)),
      'reseaux',  jsonb_build_object('weight',  5, 'score', round(s_network, 3), 'points', round(s_network * 5, 2))
    ),
    'capacity', capacity
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Recalcul : nouveau terrain publie -> demandes compatibles
-- -----------------------------------------------------------------------------

create or replace function public.refresh_matches_for_land(p_land uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  land          public.land_listings;
  req           public.participant_requests;
  result        jsonb;
  new_score     numeric;
  created_count integer := 0;
  should_notify boolean;
begin
  select * into land from public.land_listings where id = p_land;
  if not found then
    return 0;
  end if;

  -- Un terrain non publie ne doit generer aucune correspondance visible.
  if land.status <> 'publie' then
    delete from public.matches where land_id = p_land;
    return 0;
  end if;

  for req in
    select * from public.participant_requests where status = 'active'
  loop
    result    := public.match_score(req, land);
    new_score := (result ->> 'score')::numeric;

    if new_score < public.match_min_score() then
      delete from public.matches where request_id = req.id and land_id = land.id;
      continue;
    end if;

    insert into public.matches (request_id, land_id, score, breakdown)
    values (req.id, land.id, new_score, result -> 'criteria')
    on conflict (request_id, land_id) do update
      set score     = excluded.score,
          breakdown = excluded.breakdown
    returning (matches.notified_at is null) into should_notify;

    created_count := created_count + 1;

    if should_notify and new_score >= public.match_notify_score() then
      insert into public.notifications (profile_id, kind, title, body, url, payload)
      values (
        req.participant_id,
        'nouveau_match_terrain',
        'Nouveau terrain correspondant a votre recherche',
        format(
          'Un terrain a %s correspond a %s %% de vos criteres : %s m2 — %s.',
          coalesce((select name_fr from public.cities where id = land.city_id),
                   land.city_other,
                   (select name_fr from public.regions where code = land.region_code)),
          round(new_score),
          trim(to_char(land.surface_m2, 'FM999999990.##')),
          upper(land.zoning::text)
        ),
        '/terrains/' || land.id,
        jsonb_build_object('land_id', land.id, 'request_id', req.id, 'score', new_score)
      );

      update public.matches
         set notified_at = now()
       where request_id = req.id and land_id = land.id;
    end if;
  end loop;

  return created_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Recalcul : nouvelle demande -> terrains disponibles (systeme inverse)
-- -----------------------------------------------------------------------------

create or replace function public.refresh_matches_for_request(p_request uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  req           public.participant_requests;
  land          public.land_listings;
  result        jsonb;
  new_score     numeric;
  created_count integer := 0;
  best_score    numeric := 0;
begin
  select * into req from public.participant_requests where id = p_request;
  if not found then
    return 0;
  end if;

  if req.status <> 'active' then
    delete from public.matches where request_id = p_request;
    return 0;
  end if;

  for land in
    select * from public.land_listings where status = 'publie'
  loop
    result    := public.match_score(req, land);
    new_score := (result ->> 'score')::numeric;

    if new_score < public.match_min_score() then
      delete from public.matches where request_id = req.id and land_id = land.id;
      continue;
    end if;

    insert into public.matches (request_id, land_id, score, breakdown)
    values (req.id, land.id, new_score, result -> 'criteria')
    on conflict (request_id, land_id) do update
      set score     = excluded.score,
          breakdown = excluded.breakdown;

    created_count := created_count + 1;
    best_score    := greatest(best_score, new_score);
  end loop;

  -- Une seule notification de synthese : "3 terrains correspondent a votre demande".
  if created_count > 0 and best_score >= public.match_notify_score() then
    insert into public.notifications (profile_id, kind, title, body, url, payload)
    values (
      req.participant_id,
      'nouveau_match_terrain',
      format('%s terrain%s correspond%s a votre demande',
             created_count,
             case when created_count > 1 then 's' else '' end,
             case when created_count > 1 then 'ent' else '' end),
      format('Meilleure correspondance : %s %%. Consultez les terrains proposes.',
             round(best_score)),
      '/mes-demandes/' || req.id,
      jsonb_build_object('request_id', req.id, 'count', created_count, 'best_score', best_score)
    );

    update public.matches
       set notified_at = now()
     where request_id = req.id and notified_at is null;
  end if;

  return created_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Declencheurs
-- -----------------------------------------------------------------------------

create or replace function public.trg_land_matching()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Recalcul si le terrain vient d'etre publie, s'il quitte la publication,
  -- ou si un critere entrant dans le score a change.
  if tg_op = 'INSERT' then
    if new.status = 'publie' then
      perform public.refresh_matches_for_land(new.id);
    end if;
    return new;
  end if;

  if old.status is distinct from new.status
     or old.region_code is distinct from new.region_code
     or old.city_id is distinct from new.city_id
     or old.zoning is distinct from new.zoning
     or old.surface_m2 is distinct from new.surface_m2
     or old.price_per_m2 is distinct from new.price_per_m2
     or old.declared_units is distinct from new.declared_units
     or old.has_water is distinct from new.has_water
     or old.has_electricity is distinct from new.has_electricity
     or old.has_sewage is distinct from new.has_sewage
  then
    perform public.refresh_matches_for_land(new.id);
  end if;

  return new;
end;
$$;

create trigger land_listings_matching
  after insert or update on public.land_listings
  for each row execute function public.trg_land_matching();

create or replace function public.trg_request_matching()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'active' then
      perform public.refresh_matches_for_request(new.id);
    end if;
    return new;
  end if;

  if old.status is distinct from new.status
     or old.region_code is distinct from new.region_code
     or old.city_id is distinct from new.city_id
     or old.property_needs is distinct from new.property_needs
     or old.budget_total_min is distinct from new.budget_total_min
     or old.budget_total_max is distinct from new.budget_total_max
     or old.budget_per_unit_min is distinct from new.budget_per_unit_min
     or old.budget_per_unit_max is distinct from new.budget_per_unit_max
     or old.units_wanted is distinct from new.units_wanted
     or old.requires_water is distinct from new.requires_water
     or old.requires_electricity is distinct from new.requires_electricity
     or old.requires_sewage is distinct from new.requires_sewage
  then
    perform public.refresh_matches_for_request(new.id);
  end if;

  return new;
end;
$$;

create trigger participant_requests_matching
  after insert or update on public.participant_requests
  for each row execute function public.trg_request_matching();

-- -----------------------------------------------------------------------------
-- Recalcul global (maintenance / administration)
-- -----------------------------------------------------------------------------

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
  for land_id in select id from public.land_listings where status = 'publie' loop
    total := total + public.refresh_matches_for_land(land_id);
  end loop;
  return total;
end;
$$;

-- -----------------------------------------------------------------------------
-- Recherche de correspondances a la volee, sans persister (previsualisation)
-- Utilise par le formulaire de demande : "3 terrains correspondent deja".
-- -----------------------------------------------------------------------------

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
