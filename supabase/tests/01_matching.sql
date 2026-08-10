-- =============================================================================
-- Test fonctionnel du moteur de matching et des règles RLS.
-- À rejouer sur une base fraîche : stubs + migrations, puis ce fichier.
--   psql -d ntcharkou_test -f supabase/tests/01_matching.sql
-- Le script échoue (exception) au premier écart constaté.
-- =============================================================================

begin;

set local client_min_messages = warning;

-- --- Comptes de test ---------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'proprio@test.ma',
   '{"first_name":"Ahmed","last_name":"Benali","role":"owner"}'),
  ('22222222-2222-2222-2222-222222222222', 'medecin@test.ma',
   '{"first_name":"Salma","last_name":"Idrissi","role":"participant"}'),
  ('33333333-3333-3333-3333-333333333333', 'autre@test.ma',
   '{"first_name":"Youssef","last_name":"Alami","role":"participant"}'),
  ('44444444-4444-4444-4444-444444444444', 'admin@test.ma',
   '{"first_name":"Nadia","last_name":"Cherkaoui","role":"participant"}');

update public.profiles set role = 'admin' where id = '44444444-4444-4444-4444-444444444444';

do $$
begin
  if (select count(*) from public.profiles) <> 4 then
    raise exception 'Le déclencheur handle_new_user n''a pas créé les 4 profils';
  end if;
  if not exists (select 1 from public.owner_profiles
                 where profile_id = '11111111-1111-1111-1111-111111111111') then
    raise exception 'Le profil propriétaire n''a pas été créé';
  end if;
end;
$$;

-- --- Estimation de capacité --------------------------------------------------
do $$
declare
  capacity integer;
begin
  -- 1 500 m² en R+4 : 1500 × 0,60 × 5 étages / 85 m² par logement
  capacity := public.estimate_units(1500, 'r4');
  if capacity <> 52 then
    raise exception 'estimate_units(1500, r4) attendu 52, obtenu %', capacity;
  end if;

  -- La valeur déclarée prime toujours
  if public.estimate_units(1500, 'r4', 20) <> 20 then
    raise exception 'La capacité déclarée doit primer sur l''estimation';
  end if;

  -- Villa : une parcelle de 250 m² par unité
  if public.estimate_units(1000, 'villa') <> 4 then
    raise exception 'estimate_units(1000, villa) attendu 4';
  end if;
end;
$$;

-- --- Terrain de référence (exemple de la section 10) ------------------------
insert into public.land_listings (
  id, owner_id, title, region_code, city_id, district,
  zoning, surface_m2, price_per_m2,
  has_water, has_electricity, has_sewage, status
) values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'Terrain R+4 — Casablanca',
  'casablanca-settat',
  (select id from public.cities where name_fr = 'Casablanca'),
  'Sidi Maârouf',
  'r4', 1500, 7000,
  true, true, true,
  'brouillon'
);

do $$
begin
  if (select total_price from public.land_listings
      where id = 'aaaaaaaa-0000-0000-0000-000000000001') <> 10500000 then
    raise exception 'Le prix total calculé est incorrect (1500 × 7000 = 10 500 000)';
  end if;
end;
$$;

-- Un terrain non publié ne doit produire aucune correspondance.
insert into public.participant_requests (
  id, participant_id, title, region_code, city_id,
  property_needs, budget_per_unit_min, budget_per_unit_max,
  units_wanted, requires_water, requires_electricity, requires_sewage, status
) values (
  'bbbbbbbb-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222',
  'Appartement immeuble — Casablanca — 20 unités',
  'casablanca-settat',
  (select id from public.cities where name_fr = 'Casablanca'),
  array['appartement_immeuble']::public.property_need[],
  500000, 700000,
  20, true, true, true,
  'active'
);

do $$
begin
  if exists (select 1 from public.matches
             where land_id = 'aaaaaaaa-0000-0000-0000-000000000001') then
    raise exception 'Un terrain non publié ne doit générer aucune correspondance';
  end if;
end;
$$;

-- --- Publication : passe obligatoirement par la décision administrative ----
do $$
begin
  -- Le propriétaire ne peut pas publier lui-même.
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  begin
    update public.land_listings set status = 'publie'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001';
    raise exception 'Un propriétaire ne doit pas pouvoir publier son terrain lui-même';
  exception
    when insufficient_privilege then null;   -- comportement attendu
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
select public.admin_review_land('aaaaaaaa-0000-0000-0000-000000000001', 'publie');
select set_config('request.jwt.claim.sub', '', true);

do $$
begin
  if (select published_at from public.land_listings
      where id = 'aaaaaaaa-0000-0000-0000-000000000001') is null then
    raise exception 'La date de publication doit être renseignée automatiquement';
  end if;
end;
$$;

do $$
declare
  s numeric;
  b jsonb;
begin
  select score, breakdown into s, b
  from public.matches
  where land_id = 'aaaaaaaa-0000-0000-0000-000000000001'
    and request_id = 'bbbbbbbb-0000-0000-0000-000000000001';

  if s is null then
    raise exception 'Aucune correspondance créée à la publication du terrain';
  end if;

  -- Région 20 + ville 15 + type 20 + zonage 15 + budget 15 + unités 8 + réseaux 5
  if s <> 98 then
    raise exception 'Score attendu 98, obtenu % (détail : %)', s, b;
  end if;

  if (b -> 'region' ->> 'points')::numeric <> 20
     or (b -> 'budget' ->> 'points')::numeric <> 15 then
    raise exception 'Détail du score incohérent : %', b;
  end if;

  if not exists (
    select 1 from public.notifications
    where profile_id = '22222222-2222-2222-2222-222222222222'
      and kind = 'nouveau_match_terrain'
  ) then
    raise exception 'Le participant n''a pas été notifié';
  end if;

  if not exists (
    select 1 from public.notifications
    where profile_id = '11111111-1111-1111-1111-111111111111'
      and kind = 'terrain_valide'
  ) then
    raise exception 'Le propriétaire n''a pas été notifié de la publication';
  end if;
end;
$$;

-- --- Sens inverse : une nouvelle demande trouve les terrains publiés -------
insert into public.participant_requests (
  id, participant_id, title, region_code,
  property_needs, budget_total_max, units_wanted, status
) values (
  'bbbbbbbb-0000-0000-0000-000000000002',
  '33333333-3333-3333-3333-333333333333',
  'Terrain R+3 ou R+4 — région de Casablanca',
  'casablanca-settat',
  array['terrain_r3','terrain_r4']::public.property_need[],
  12000000, 15, 'active'
);

do $$
declare
  s numeric;
begin
  select score into s from public.matches
  where request_id = 'bbbbbbbb-0000-0000-0000-000000000002'
    and land_id = 'aaaaaaaa-0000-0000-0000-000000000001';

  if s is null then
    raise exception 'Le système inverse n''a pas trouvé le terrain déjà publié';
  end if;
  -- Ville non précisée => 15 pts (indifférent), réseaux 5 pts (3/3 présents)
  if s < 90 then
    raise exception 'Score inverse anormalement bas : %', s;
  end if;
end;
$$;

-- --- Une demande hors zone ne doit pas matcher -----------------------------
insert into public.participant_requests (
  id, participant_id, title, region_code,
  property_needs, budget_total_max, units_wanted, status
) values (
  'bbbbbbbb-0000-0000-0000-000000000003',
  '33333333-3333-3333-3333-333333333333',
  'Mini-ferme — Souss-Massa',
  'souss-massa',
  array['mini_ferme']::public.property_need[],
  800000, 1, 'active'
);

do $$
begin
  if exists (
    select 1 from public.matches
    where request_id = 'bbbbbbbb-0000-0000-0000-000000000003'
  ) then
    raise exception 'Une demande incompatible (région, typologie, budget) ne doit pas matcher';
  end if;
end;
$$;

-- --- Mise en pause : les correspondances disparaissent ----------------------
update public.participant_requests set status = 'en_pause'
 where id = 'bbbbbbbb-0000-0000-0000-000000000002';

do $$
begin
  if exists (select 1 from public.matches
             where request_id = 'bbbbbbbb-0000-0000-0000-000000000002') then
    raise exception 'Une demande en pause ne doit plus porter de correspondance';
  end if;
end;
$$;

-- --- Projet participatif : constitution automatique du groupe --------------
insert into public.projects (
  id, created_by, title, region_code, city_id,
  property_need, zoning, units_planned, participants_target,
  restricted_to_body, status
) values (
  'cccccccc-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222',
  'Résidence des Médecins — Casablanca',
  'casablanca-settat',
  (select id from public.cities where name_fr = 'Casablanca'),
  'appartement_immeuble', 'r4', 20, 2,
  'medecin', 'proposition'
);

select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
select public.admin_review_project('cccccccc-0000-0000-0000-000000000001', 'ouvert');
select set_config('request.jwt.claim.sub', '', true);

insert into public.project_participants (project_id, participant_id, status)
values ('cccccccc-0000-0000-0000-000000000001',
        '22222222-2222-2222-2222-222222222222', 'accepte');

insert into public.project_participants (project_id, participant_id, status)
values ('cccccccc-0000-0000-0000-000000000001',
        '33333333-3333-3333-3333-333333333333', 'candidature');

do $$
begin
  if (select status from public.projects where id = 'cccccccc-0000-0000-0000-000000000001')
     <> 'ouvert' then
    raise exception 'Le projet ne doit pas se clore avec une seule confirmation';
  end if;
end;
$$;

update public.project_participants set status = 'accepte'
 where project_id = 'cccccccc-0000-0000-0000-000000000001'
   and participant_id = '33333333-3333-3333-3333-333333333333';

do $$
begin
  if (select status from public.projects where id = 'cccccccc-0000-0000-0000-000000000001')
     <> 'groupe_constitue' then
    raise exception 'Le groupe complet doit basculer en « groupe_constitue »';
  end if;

  if not exists (
    select 1 from public.notifications
    where kind = 'projet_complet'
      and profile_id = '33333333-3333-3333-3333-333333333333'
  ) then
    raise exception 'Les membres doivent être notifiés de la constitution du groupe';
  end if;
end;
$$;

commit;

-- =============================================================================
-- Contrôles RLS — exécutés hors transaction pour pouvoir changer de rôle.
-- =============================================================================

-- Visiteur anonyme : seuls les terrains publiés sont visibles.
set role anon;
select set_config('request.jwt.claim.sub', '', true);

do $$
declare
  n integer;
begin
  if (select count(*) from public.land_listings) <> 1 then
    raise exception 'Un visiteur anonyme doit voir exactement le terrain publié';
  end if;

  -- Demandes et notifications : ni GRANT, ni politique. Les deux barrières
  -- doivent tenir, on accepte donc l'erreur de privilège comme le zéro ligne.
  begin
    select count(*) into n from public.participant_requests;
    if n <> 0 then
      raise exception 'Les demandes ne doivent jamais être visibles publiquement';
    end if;
  exception when insufficient_privilege then null;
  end;

  begin
    select count(*) into n from public.notifications;
    if n <> 0 then
      raise exception 'Les notifications ne doivent jamais être visibles publiquement';
    end if;
  exception when insufficient_privilege then null;
  end;

  -- Les documents juridiques ne sont jamais accessibles sans compte.
  begin
    select count(*) into n from public.land_documents;
    if n <> 0 then
      raise exception 'Les documents juridiques ne doivent jamais fuiter';
    end if;
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- Participant : voit ses demandes, pas celles des autres.
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);

do $$
begin
  if (select count(*) from public.participant_requests) <> 1 then
    raise exception 'Le participant ne doit voir que sa propre demande';
  end if;
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'Le participant ne doit lire que son propre profil';
  end if;
  if (select count(*) from public.land_documents) <> 0 then
    raise exception 'Les documents d''un terrain tiers ne doivent pas être lisibles';
  end if;
  if (select count(*) from public.matches) <> 1 then
    raise exception 'Le participant ne doit voir que les correspondances de ses demandes';
  end if;
end;
$$;

-- Il ne peut pas s'auto-promouvoir administrateur.
update public.profiles set role = 'admin' where id = '22222222-2222-2222-2222-222222222222';
do $$
begin
  if (select role from public.profiles where id = '22222222-2222-2222-2222-222222222222')
     <> 'participant' then
    raise exception 'Un utilisateur ne doit pas pouvoir changer son propre rôle';
  end if;
end;
$$;

reset role;

-- Administrateur : accès complet.
set role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);

do $$
declare
  kpis jsonb;
begin
  if (select count(*) from public.participant_requests) < 3 then
    raise exception 'L''administrateur doit voir toutes les demandes';
  end if;

  kpis := public.admin_kpis();
  if (kpis ->> 'terrains')::int <> 1 then
    raise exception 'KPI « terrains » incorrect : %', kpis;
  end if;
  if (kpis ->> 'participants')::int < 2 then
    raise exception 'KPI « participants » incorrect : %', kpis;
  end if;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', '', false);

\echo '=== Tous les contrôles sont passés ==='
