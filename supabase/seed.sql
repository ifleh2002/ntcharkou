-- =============================================================================
-- Jeu de démonstration — À N'EXÉCUTER QUE SUR UN ENVIRONNEMENT DE TEST.
--
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Crée quatre comptes, six terrains publiés, quatre demandes et deux projets
-- participatifs. Le moteur de matching se déclenche seul : à la fin du script,
-- la table `matches` est déjà peuplée.
--
-- Les comptes sont insérés directement dans auth.users sans mot de passe
-- utilisable : pour vous connecter, créez vos comptes via l'interface
-- d'inscription, puis promouvez le vôtre en administrateur (voir le README).
-- =============================================================================

begin;

-- --- Comptes -----------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('0a000000-0000-4000-8000-000000000001', 'demo.proprietaire@ntcharkou.test',
   '{"first_name":"Ahmed","last_name":"Benali","role":"owner","phone":"0661000001"}'),
  ('0a000000-0000-4000-8000-000000000002', 'demo.societe@ntcharkou.test',
   '{"first_name":"Karim","last_name":"Tazi","role":"owner","phone":"0661000002"}'),
  ('0a000000-0000-4000-8000-000000000003', 'demo.medecin@ntcharkou.test',
   '{"first_name":"Salma","last_name":"Idrissi","role":"participant","phone":"0661000003"}'),
  ('0a000000-0000-4000-8000-000000000004', 'demo.enseignant@ntcharkou.test',
   '{"first_name":"Youssef","last_name":"Alami","role":"participant","phone":"0661000004"}')
on conflict (id) do nothing;

update public.participant_profiles set professional_body = 'medecin'
 where profile_id = '0a000000-0000-4000-8000-000000000003';
update public.participant_profiles set professional_body = 'enseignant'
 where profile_id = '0a000000-0000-4000-8000-000000000004';

-- --- Terrains ----------------------------------------------------------------
insert into public.land_listings (
  id, owner_id, title, description, region_code, city_id, district,
  zoning, surface_m2, facade_m, depth_m, facade_count, road_width_m,
  legal_status, price_per_m2, price_negotiable,
  has_water, has_electricity, has_sewage, has_telecom, status
) values
  ('0b000000-0000-4000-8000-000000000001',
   '0a000000-0000-4000-8000-000000000001',
   'Terrain R+4 — Casablanca, Sidi Maârouf',
   'Terrain d''angle en zone R+4, à proximité immédiate des axes principaux et des commerces. Idéal pour un immeuble de standing.',
   'casablanca-settat', (select id from public.cities where name_fr = 'Casablanca'),
   'Sidi Maârouf', 'r4', 1500, 30, 50, 2, 20,
   'titre_foncier', 7000, true, true, true, true, true, 'brouillon'),

  ('0b000000-0000-4000-8000-000000000002',
   '0a000000-0000-4000-8000-000000000001',
   'Terrain résidentiel — Bouskoura',
   'Parcelle plate dans un quartier résidentiel calme, viabilisée.',
   'casablanca-settat', (select id from public.cities where name_fr = 'Bouskoura'),
   'Ville Verte', 'villa', 800, 20, 40, 1, 12,
   'titre_foncier', 4500, false, true, true, true, false, 'brouillon'),

  ('0b000000-0000-4000-8000-000000000003',
   '0a000000-0000-4000-8000-000000000002',
   'Terrain R+3 — Rabat, Hay Riad',
   'Emplacement recherché, proche des administrations et des écoles.',
   'rabat-sale-kenitra', (select id from public.cities where name_fr = 'Rabat'),
   'Hay Riad', 'r3', 1200, 24, 50, 2, 18,
   'titre_foncier', 9000, false, true, true, true, true, 'brouillon'),

  ('0b000000-0000-4000-8000-000000000004',
   '0a000000-0000-4000-8000-000000000002',
   'Lotissement — Marrakech, route de l''Ourika',
   'Grand terrain destiné à un lotissement de villas, dossier administratif complet.',
   'marrakech-safi', (select id from public.cities where name_fr = 'Marrakech'),
   'Route de l''Ourika', 'lotissement', 5000, 60, 85, 3, 25,
   'titre_foncier', 2800, true, true, true, false, false, 'brouillon'),

  ('0b000000-0000-4000-8000-000000000005',
   '0a000000-0000-4000-8000-000000000001',
   'Terrain immeuble — Tanger, Malabata',
   'Vue mer, zone en fort développement, à 5 minutes de la corniche.',
   'tanger-tetouan-al-hoceima', (select id from public.cities where name_fr = 'Tanger'),
   'Malabata', 'immeuble', 900, 22, 41, 2, 15,
   'titre_foncier', 8500, false, true, true, true, true, 'brouillon'),

  ('0b000000-0000-4000-8000-000000000006',
   '0a000000-0000-4000-8000-000000000002',
   'Terrain agricole — Agadir, Drarga',
   'Terrain agricole irrigué, adapté à un projet de mini-fermes.',
   'souss-massa', (select id from public.cities where name_fr = 'Agadir'),
   'Drarga', 'agricole', 12000, null, null, 1, 8,
   'melkia', 900, true, true, false, false, false, 'brouillon')
on conflict (id) do nothing;

-- Publication : passe par le chemin normal (déclencheurs + horodatage).
update public.land_listings set status = 'publie'
 where id::text like '0b000000-0000-4000-8000-%';

-- --- Demandes ----------------------------------------------------------------
insert into public.participant_requests (
  id, participant_id, title, notes, region_code, city_id,
  property_needs, budget_total_min, budget_total_max,
  budget_per_unit_min, budget_per_unit_max, units_wanted,
  same_body_preference, preferred_body,
  requires_water, requires_electricity, requires_sewage, status
) values
  ('0c000000-0000-4000-8000-000000000001',
   '0a000000-0000-4000-8000-000000000003',
   'Appartement en immeuble — Casablanca — 20 unités',
   'Groupe de médecins souhaitant un immeuble de standing.',
   'casablanca-settat', (select id from public.cities where name_fr = 'Casablanca'),
   array['appartement_immeuble']::public.property_need[],
   null, null, 500000, 700000, 20,
   'oui', 'medecin', true, true, true, 'active'),

  ('0c000000-0000-4000-8000-000000000002',
   '0a000000-0000-4000-8000-000000000004',
   'Terrain R+3 ou R+4 — Rabat — 12 unités',
   'Enseignants cherchant un projet collectif à Rabat.',
   'rabat-sale-kenitra', (select id from public.cities where name_fr = 'Rabat'),
   array['terrain_r3','terrain_r4','appartement_immeuble']::public.property_need[],
   null, 12000000, 400000, 900000, 12,
   'oui', 'enseignant', true, true, false, 'active'),

  ('0c000000-0000-4000-8000-000000000003',
   '0a000000-0000-4000-8000-000000000004',
   'Terrain villa — région de Casablanca',
   null,
   'casablanca-settat', null,
   array['terrain_villa']::public.property_need[],
   2000000, 4500000, null, null, 1,
   'indifferent', null, true, true, false, 'active'),

  ('0c000000-0000-4000-8000-000000000004',
   '0a000000-0000-4000-8000-000000000003',
   'Mini-ferme — Souss-Massa',
   'Projet de mini-fermes partagées.',
   'souss-massa', null,
   array['mini_ferme']::public.property_need[],
   null, 15000000, null, 1200000, 10,
   'non', null, true, false, false, 'active')
on conflict (id) do nothing;

-- --- Projets participatifs ---------------------------------------------------
insert into public.projects (
  id, created_by, land_id, title, summary, description,
  region_code, city_id, district, property_need, zoning,
  units_planned, participants_target, budget_per_unit,
  restricted_to_body, status
) values
  ('0d000000-0000-4000-8000-000000000001',
   '0a000000-0000-4000-8000-000000000003',
   '0b000000-0000-4000-8000-000000000001',
   'Résidence des Médecins — Casablanca',
   'Immeuble R+4 de 20 appartements, réservé aux médecins.',
   'Projet porté par un collectif de médecins exerçant à Casablanca. Le terrain est validé, le permis est à l''étude.',
   'casablanca-settat', (select id from public.cities where name_fr = 'Casablanca'),
   'Sidi Maârouf', 'appartement_immeuble', 'r4', 20, 20, 650000,
   'medecin', 'proposition'),

  ('0d000000-0000-4000-8000-000000000002',
   '0a000000-0000-4000-8000-000000000004',
   '0b000000-0000-4000-8000-000000000003',
   'Résidence des Enseignants — Rabat',
   'Immeuble R+3 de 12 appartements à Hay Riad.',
   'Collectif d''enseignants du secondaire, projet en cours de constitution.',
   'rabat-sale-kenitra', (select id from public.cities where name_fr = 'Rabat'),
   'Hay Riad', 'appartement_immeuble', 'r3', 12, 12, 850000,
   'enseignant', 'proposition')
on conflict (id) do nothing;

update public.projects set status = 'ouvert'
 where id in ('0d000000-0000-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000002');

insert into public.project_participants (project_id, participant_id, units_wanted, status)
values
  ('0d000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-000000000003', 1, 'accepte'),
  ('0d000000-0000-4000-8000-000000000002', '0a000000-0000-4000-8000-000000000004', 1, 'accepte')
on conflict (project_id, participant_id) do nothing;

commit;

-- --- Récapitulatif -----------------------------------------------------------
select
  (select count(*) from public.land_listings where status = 'publie') as terrains_publies,
  (select count(*) from public.participant_requests where status = 'active') as demandes_actives,
  (select count(*) from public.projects where status = 'ouvert') as projets_ouverts,
  (select count(*) from public.matches) as correspondances,
  (select round(avg(score), 1) from public.matches) as score_moyen;
