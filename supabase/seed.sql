-- =============================================================================
-- Ntcharkou — Jeu de démonstration et projets pilotes
-- À N'EXÉCUTER QUE SUR UN ENVIRONNEMENT DE TEST OU DE PRÉ-PRODUCTION.
--
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Contenu :
--   · 3 propriétaires et 66 participants répartis par corps professionnel
--   · 12 terrains publiés dans 8 régions
--   · 10 demandes de participants
--   · 7 projets pilotes couvrant tout le workflow, de l'analyse au réalisé
--
-- Le moteur de matching se déclenche seul : à la fin du script, la table
-- `matches` est déjà peuplée et les notifications sont émises.
--
-- Les comptes sont insérés directement dans auth.users, sans mot de passe
-- utilisable : pour vous connecter, créez votre compte via l'interface
-- d'inscription puis promouvez-le administrateur (voir le README).
--
-- Le script est ré-exécutable : toutes les insertions sont idempotentes.
-- =============================================================================

begin;

-- =============================================================================
-- 1. Comptes
-- =============================================================================

-- --- Propriétaires -----------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('0a000000-0000-4000-8000-000000000001', 'demo.proprietaire@ntcharkou.test',
   '{"first_name":"Ahmed","last_name":"Benali","role":"owner","phone":"0661000001"}'),
  ('0a000000-0000-4000-8000-000000000002', 'demo.societe@ntcharkou.test',
   '{"first_name":"Karim","last_name":"Tazi","role":"owner","phone":"0661000002"}'),
  ('0a000000-0000-4000-8000-000000000003', 'demo.heritiers@ntcharkou.test',
   '{"first_name":"Fatima","last_name":"Bennani","role":"owner","phone":"0661000003"}')
on conflict (id) do nothing;

update public.owner_profiles set owner_kind = 'societe', company_name = 'Tazi Immobilier SARL'
 where profile_id = '0a000000-0000-4000-8000-000000000002';
update public.owner_profiles set owner_kind = 'heritiers'
 where profile_id = '0a000000-0000-4000-8000-000000000003';

-- --- Participants ------------------------------------------------------------
-- Table temporaire : elle sert à générer les comptes puis à peupler les
-- groupes des projets pilotes sans réécrire vingt fois les mêmes UUID.
create temporary table seed_people (
  idx        integer primary key,
  id         uuid,
  first_name text,
  last_name  text,
  body       public.professional_body,
  region     text
) on commit drop;

-- Les participants sont générés : noms combinés à partir de deux listes, et
-- répartition par corps professionnel calibrée sur les groupes des projets
-- pilotes (il faut assez de médecins pour remplir la résidence de Casablanca,
-- assez d'enseignants pour deux projets distincts, etc.).
insert into seed_people (idx, first_name, last_name, body, region)
select
  i,
  (array['Salma','Reda','Nawal','Hicham','Meryem','Omar','Youssef','Khadija',
         'Rachid','Amina','Mehdi','Sanaa','Tarik','Ilham','Anas','Leila',
         'Jamal','Hanane','Said','Zineb'])[1 + (i - 1) % 20],
  (array['Idrissi','Chraibi','Berrada','Sekkat','Fassi','Lahlou','Alami',
         'Ouazzani','Belkacem','Sabri','Kettani','Rifai','Amrani'])[1 + (i - 1) % 13],
  case
    when i <= 16 then 'medecin'
    when i <= 36 then 'enseignant'
    when i <= 44 then 'ingenieur'
    when i <= 50 then 'pharmacien'
    when i <= 58 then 'fonctionnaire'
    when i <= 62 then 'entrepreneur'
    else              'cadre'
  end::public.professional_body,
  case
    when i <= 16 then 'casablanca-settat'
    when i <= 28 then 'rabat-sale-kenitra'
    when i <= 36 then 'fes-meknes'
    when i <= 44 then 'marrakech-safi'
    when i <= 50 then 'fes-meknes'
    when i <= 58 then 'tanger-tetouan-al-hoceima'
    else              'souss-massa'
  end
from generate_series(1, 66) as i;

update seed_people
   set id = ('0a000000-0000-4000-8000-' || lpad((100 + idx)::text, 12, '0'))::uuid;

insert into auth.users (id, email, raw_user_meta_data)
select
  sp.id,
  format('demo.participant%s@ntcharkou.test', sp.idx),
  jsonb_build_object(
    'first_name', sp.first_name,
    'last_name',  sp.last_name,
    'role',       'participant',
    'phone',      '06620' || lpad(sp.idx::text, 5, '0')
  )
from seed_people sp
on conflict (id) do nothing;

update public.participant_profiles pp
   set professional_body = sp.body,
       professional_status = case sp.body
         when 'medecin'       then 'Libéral'
         when 'pharmacien'    then 'Libéral'
         when 'enseignant'    then 'Fonctionnaire'
         when 'fonctionnaire' then 'Fonctionnaire'
         when 'ingenieur'     then 'Salarié'
         else 'Salarié'
       end
  from seed_people sp
 where pp.profile_id = sp.id;

update public.profiles p
   set region_code = sp.region
  from seed_people sp
 where p.id = sp.id;

-- =============================================================================
-- 2. Terrains
-- =============================================================================

insert into public.land_listings (
  id, owner_id, title, description, region_code, city_id, district,
  zoning, surface_m2, facade_m, depth_m, facade_count, road_width_m,
  legal_status, price_per_m2, declared_units, price_negotiable,
  has_water, has_electricity, has_sewage, has_telecom, status
) values
  -- Casablanca-Settat
  ('0b000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-000000000001',
   'Terrain R+4 — Casablanca, Sidi Maârouf',
   'Terrain d''angle en zone R+4, à proximité immédiate des axes principaux et des commerces. Idéal pour un immeuble de standing.',
   'casablanca-settat', (select id from public.cities where name_fr = 'Casablanca'),
   'Sidi Maârouf', 'r4', 1500, 30, 50, 2, 20,
   'titre_foncier', 7000, 20, true, true, true, true, true, 'brouillon'),

  ('0b000000-0000-4000-8000-000000000002', '0a000000-0000-4000-8000-000000000001',
   'Terrain villa — Bouskoura, Ville Verte',
   'Parcelle plate dans un quartier résidentiel calme, entièrement viabilisée.',
   'casablanca-settat', (select id from public.cities where name_fr = 'Bouskoura'),
   'Ville Verte', 'villa', 800, 20, 40, 1, 12,
   'titre_foncier', 4500, null, false, true, true, true, false, 'brouillon'),

  ('0b000000-0000-4000-8000-000000000003', '0a000000-0000-4000-8000-000000000002',
   'Terrain R+3 — Mohammédia, centre',
   'Proche du centre-ville et de la gare, quartier en pleine restructuration.',
   'casablanca-settat', (select id from public.cities where name_fr = 'Mohammédia'),
   'Centre', 'r3', 1000, 25, 40, 2, 15,
   'titre_foncier', 6200, null, true, true, true, true, true, 'brouillon'),

  -- Rabat-Salé-Kénitra
  ('0b000000-0000-4000-8000-000000000004', '0a000000-0000-4000-8000-000000000002',
   'Terrain R+3 — Rabat, Hay Riad',
   'Emplacement recherché, proche des administrations et des écoles.',
   'rabat-sale-kenitra', (select id from public.cities where name_fr = 'Rabat'),
   'Hay Riad', 'r3', 1200, 24, 50, 2, 18,
   'titre_foncier', 9000, 12, false, true, true, true, true, 'brouillon'),

  ('0b000000-0000-4000-8000-000000000005', '0a000000-0000-4000-8000-000000000003',
   'Terrain résidentiel — Témara, Massira',
   'Terrain de lotissement en zone résidentielle, dossier en règle.',
   'rabat-sale-kenitra', (select id from public.cities where name_fr = 'Témara'),
   'Massira', 'residentiel', 1800, 35, 51, 2, 16,
   'titre_foncier', 5200, null, true, true, true, true, false, 'brouillon'),

  -- Marrakech-Safi
  ('0b000000-0000-4000-8000-000000000006', '0a000000-0000-4000-8000-000000000002',
   'Lotissement — Marrakech, route de l''Ourika',
   'Grand terrain destiné à un lotissement de villas, dossier administratif complet.',
   'marrakech-safi', (select id from public.cities where name_fr = 'Marrakech'),
   'Route de l''Ourika', 'lotissement', 5000, 60, 85, 3, 25,
   'titre_foncier', 2800, 18, true, true, true, false, false, 'brouillon'),

  ('0b000000-0000-4000-8000-000000000007', '0a000000-0000-4000-8000-000000000003',
   'Terrain villa — Essaouira, Diabat',
   'Vue dégagée sur l''océan, à quelques minutes de la médina.',
   'marrakech-safi', (select id from public.cities where name_fr = 'Essaouira'),
   'Diabat', 'villa', 1100, 26, 42, 2, 14,
   'melkia', 3600, null, true, true, true, false, false, 'brouillon'),

  -- Tanger-Tétouan-Al Hoceïma
  ('0b000000-0000-4000-8000-000000000008', '0a000000-0000-4000-8000-000000000001',
   'Terrain immeuble — Tanger, Malabata',
   'Vue mer, zone en fort développement, à cinq minutes de la corniche.',
   'tanger-tetouan-al-hoceima', (select id from public.cities where name_fr = 'Tanger'),
   'Malabata', 'immeuble', 900, 22, 41, 2, 15,
   'titre_foncier', 8500, 14, false, true, true, true, true, 'brouillon'),

  ('0b000000-0000-4000-8000-000000000009', '0a000000-0000-4000-8000-000000000003',
   'Terrain R+2 — Tétouan, Sania Ramel',
   'Quartier calme, à proximité de l''aéroport et des écoles.',
   'tanger-tetouan-al-hoceima', (select id from public.cities where name_fr = 'Tétouan'),
   'Sania Ramel', 'r2', 700, 20, 35, 1, 12,
   'titre_foncier', 4200, null, true, true, true, false, false, 'brouillon'),

  -- Fès-Meknès
  ('0b000000-0000-4000-8000-00000000000a', '0a000000-0000-4000-8000-000000000002',
   'Terrain R+3 — Fès, Route d''Imouzzer',
   'Axe structurant, proche du CHU et des cliniques privées.',
   'fes-meknes', (select id from public.cities where name_fr = 'Fès'),
   'Route d''Imouzzer', 'r3', 950, 22, 43, 2, 18,
   'titre_foncier', 5800, 10, true, true, true, true, true, 'brouillon'),

  ('0b000000-0000-4000-8000-00000000000b', '0a000000-0000-4000-8000-000000000001',
   'Terrain R+2 — Meknès, Marjane',
   'Quartier résidentiel établi, commerces et écoles à proximité.',
   'fes-meknes', (select id from public.cities where name_fr = 'Meknès'),
   'Marjane', 'r2', 850, 21, 40, 2, 14,
   'titre_foncier', 4000, 8, false, true, true, true, false, 'brouillon'),

  -- Souss-Massa
  ('0b000000-0000-4000-8000-00000000000c', '0a000000-0000-4000-8000-000000000003',
   'Terrain agricole — Agadir, Drarga',
   'Terrain agricole irrigué, adapté à un projet de mini-fermes partagées.',
   'souss-massa', (select id from public.cities where name_fr = 'Agadir'),
   'Drarga', 'agricole', 12000, null, null, 1, 8,
   'melkia', 900, 10, true, true, false, false, false, 'brouillon')
on conflict (id) do nothing;

-- Publication : sans session, le garde-fou laisse passer (contexte serveur),
-- les déclencheurs horodatent et lancent le matching.
update public.land_listings set status = 'publie'
 where id::text like '0b000000-0000-4000-8000-%'
   and status <> 'publie';

-- =============================================================================
-- 3. Demandes des participants
-- =============================================================================

insert into public.participant_requests (
  id, participant_id, title, notes, region_code, city_id,
  property_needs, budget_total_min, budget_total_max,
  budget_per_unit_min, budget_per_unit_max, units_wanted,
  same_body_preference, preferred_body,
  requires_water, requires_electricity, requires_sewage, status
)
select * from (values
  ('0c000000-0000-4000-8000-000000000001'::uuid,
   (select id from seed_people where idx = 1),
   'Appartement en immeuble — Casablanca — 20 unités',
   'Collectif de médecins souhaitant un immeuble de standing.',
   'casablanca-settat', (select id from public.cities where name_fr = 'Casablanca'),
   array['appartement_immeuble']::public.property_need[],
   null::numeric, null::numeric, 500000::numeric, 700000::numeric, 20,
   'oui'::public.same_body_preference, 'medecin'::public.professional_body,
   true, true, true, 'active'::public.request_status),

  ('0c000000-0000-4000-8000-000000000002'::uuid,
   (select id from seed_people where idx = 2),
   'Appartement R+4 — Casablanca — 18 unités',
   null,
   'casablanca-settat', (select id from public.cities where name_fr = 'Casablanca'),
   array['appartement_immeuble','terrain_r4']::public.property_need[],
   null, 12000000, 480000, 720000, 18,
   'oui', 'medecin', true, true, true, 'active'),

  ('0c000000-0000-4000-8000-000000000003'::uuid,
   (select id from seed_people where idx = 17),
   'Terrain R+3 ou R+4 — Rabat — 12 unités',
   'Enseignants cherchant un projet collectif à Rabat.',
   'rabat-sale-kenitra', (select id from public.cities where name_fr = 'Rabat'),
   array['terrain_r3','terrain_r4','appartement_immeuble']::public.property_need[],
   null, 12000000, 400000, 900000, 12,
   'oui', 'enseignant', true, true, false, 'active'),

  ('0c000000-0000-4000-8000-000000000004'::uuid,
   (select id from seed_people where idx = 18),
   'Appartement en résidence fermée — Témara',
   null,
   'rabat-sale-kenitra', (select id from public.cities where name_fr = 'Témara'),
   array['appartement_residence_fermee','appartement_r2']::public.property_need[],
   null, 9500000, 350000, 650000, 14,
   'indifferent', null, true, true, false, 'active'),

  ('0c000000-0000-4000-8000-000000000005'::uuid,
   (select id from seed_people where idx = 37),
   'Terrain villa en lotissement — Marrakech — 18 lots',
   'Groupe d''ingénieurs, projet de lotissement de villas.',
   'marrakech-safi', (select id from public.cities where name_fr = 'Marrakech'),
   array['terrain_villa']::public.property_need[],
   null, 16000000, 600000, 950000, 18,
   'oui', 'ingenieur', true, true, false, 'active'),

  ('0c000000-0000-4000-8000-000000000006'::uuid,
   (select id from seed_people where idx = 45),
   'Appartement R+3 — Fès — 10 unités',
   'Pharmaciens souhaitant un immeuble proche du CHU.',
   'fes-meknes', (select id from public.cities where name_fr = 'Fès'),
   array['appartement_immeuble','terrain_r3']::public.property_need[],
   null, 7000000, 450000, 700000, 10,
   'oui', 'pharmacien', true, true, true, 'active'),

  ('0c000000-0000-4000-8000-000000000007'::uuid,
   (select id from seed_people where idx = 51),
   'Appartement R+2 — Tétouan — 8 unités',
   'Fonctionnaires, budget maîtrisé.',
   'tanger-tetouan-al-hoceima', (select id from public.cities where name_fr = 'Tétouan'),
   array['appartement_r2','terrain_r2']::public.property_need[],
   null, 4000000, 300000, 500000, 8,
   'oui', 'fonctionnaire', true, true, false, 'active'),

  ('0c000000-0000-4000-8000-000000000008'::uuid,
   (select id from seed_people where idx = 52),
   'Appartement vue mer — Tanger — 14 unités',
   null,
   'tanger-tetouan-al-hoceima', (select id from public.cities where name_fr = 'Tanger'),
   array['appartement_immeuble']::public.property_need[],
   null, 9000000, 500000, 800000, 14,
   'indifferent', null, true, true, true, 'active'),

  ('0c000000-0000-4000-8000-000000000009'::uuid,
   (select id from seed_people where idx = 59),
   'Mini-ferme — Souss-Massa — 10 parcelles',
   'Projet de mini-fermes partagées autour d''Agadir.',
   'souss-massa', null,
   array['mini_ferme']::public.property_need[],
   null, 15000000, null, 1200000, 10,
   'non', null, true, false, false, 'active'),

  ('0c000000-0000-4000-8000-00000000000a'::uuid,
   (select id from seed_people where idx = 63),
   'Terrain villa — région de Casablanca',
   'Recherche individuelle, budget serré.',
   'casablanca-settat', null,
   array['terrain_villa']::public.property_need[],
   2000000, 4500000, null, null, 1,
   'indifferent', null, true, true, false, 'active')
) as v
on conflict (id) do nothing;

-- =============================================================================
-- 4. Projets pilotes
--
-- Sept projets couvrant l'ensemble du workflow décrit en section 14 :
-- analyse → validation → ouvert → groupe constitué → en préparation → réalisé.
-- =============================================================================

insert into public.projects (
  id, created_by, land_id, title, summary, description,
  region_code, city_id, district, property_need, zoning,
  units_planned, participants_target, budget_per_unit,
  restricted_to_body, status
) values

  -- (1) Ouvert — le cas de référence, groupe à moitié constitué
  ('0d000000-0000-4000-8000-000000000001',
   (select id from seed_people where idx = 1),
   '0b000000-0000-4000-8000-000000000001',
   'Résidence des Médecins — Casablanca',
   'Immeuble R+4 de 20 appartements à Sidi Maârouf, réservé aux médecins.',
   'Projet pilote porté par un collectif de médecins exerçant à Casablanca. Le terrain de 1 500 m² est validé et le dossier de permis est à l''étude. Les appartements font de 90 à 120 m², avec parking en sous-sol et espaces communs.',
   'casablanca-settat', (select id from public.cities where name_fr = 'Casablanca'),
   'Sidi Maârouf', 'appartement_immeuble', 'r4', 20, 20, 650000,
   'medecin', 'proposition'),

  -- (2) Groupe constitué — la cible est atteinte
  ('0d000000-0000-4000-8000-000000000002',
   (select id from seed_people where idx = 17),
   '0b000000-0000-4000-8000-000000000004',
   'Résidence des Enseignants — Rabat',
   'Immeuble R+3 de 12 appartements à Hay Riad.',
   'Collectif d''enseignants du secondaire. Le groupe est complet ; le montage juridique de la coopérative est engagé.',
   'rabat-sale-kenitra', (select id from public.cities where name_fr = 'Rabat'),
   'Hay Riad', 'appartement_immeuble', 'r3', 12, 12, 850000,
   'enseignant', 'proposition'),

  -- (3) Ouvert — lotissement de villas
  ('0d000000-0000-4000-8000-000000000003',
   (select id from seed_people where idx = 37),
   '0b000000-0000-4000-8000-000000000006',
   'Village des Ingénieurs — Marrakech',
   'Lotissement de 18 villas sur la route de l''Ourika.',
   'Projet pilote de lotissement porté par un groupe d''ingénieurs. Chaque lot fait environ 270 m², avec voirie, réseaux et espaces verts mutualisés.',
   'marrakech-safi', (select id from public.cities where name_fr = 'Marrakech'),
   'Route de l''Ourika', 'terrain_villa', 'lotissement', 18, 18, 780000,
   'ingenieur', 'proposition'),

  -- (4) En préparation — permis obtenu
  ('0d000000-0000-4000-8000-000000000004',
   (select id from seed_people where idx = 51),
   '0b000000-0000-4000-8000-000000000008',
   'Résidence Al Amal — Tanger Malabata',
   'Immeuble de 14 appartements avec vue mer.',
   'Projet pilote ouvert à tous les corps professionnels. Groupe complet, permis de construire obtenu, démarrage du chantier prévu au prochain trimestre.',
   'tanger-tetouan-al-hoceima', (select id from public.cities where name_fr = 'Tanger'),
   'Malabata', 'appartement_immeuble', 'immeuble', 14, 14, 720000,
   null, 'proposition'),

  -- (5) Ouvert — mini-fermes
  ('0d000000-0000-4000-8000-000000000005',
   (select id from seed_people where idx = 59),
   '0b000000-0000-4000-8000-00000000000c',
   'Mini-fermes du Souss — Agadir Drarga',
   'Dix parcelles agricoles de 1 200 m², irriguées et clôturées.',
   'Projet pilote agricole : mise en commun d''un terrain irrigué de 12 000 m², divisé en dix parcelles avec forage et clôture mutualisés.',
   'souss-massa', (select id from public.cities where name_fr = 'Agadir'),
   'Drarga', 'mini_ferme', 'agricole', 10, 10, 1100000,
   null, 'proposition'),

  -- (6) En analyse — pas encore ouvert aux candidatures
  ('0d000000-0000-4000-8000-000000000006',
   (select id from seed_people where idx = 45),
   '0b000000-0000-4000-8000-00000000000a',
   'Coopérative des Pharmaciens — Fès',
   'Immeuble R+3 de 10 appartements, route d''Imouzzer.',
   'Dossier en cours d''analyse par l''administration : vérification du titre foncier et de la note de renseignement urbanistique.',
   'fes-meknes', (select id from public.cities where name_fr = 'Fès'),
   'Route d''Imouzzer', 'appartement_immeuble', 'r3', 10, 10, 620000,
   'pharmacien', 'proposition'),

  -- (7) Réalisé — sert de référence dans les statistiques
  ('0d000000-0000-4000-8000-000000000007',
   (select id from seed_people where idx = 29),
   '0b000000-0000-4000-8000-00000000000b',
   'Résidence Bahia — Meknès Marjane',
   'Huit appartements R+2 livrés, premier projet abouti de la plateforme.',
   'Premier projet pilote mené à son terme : groupe constitué en quatre mois, permis obtenu, chantier livré. Il sert de référence pour les projets suivants.',
   'fes-meknes', (select id from public.cities where name_fr = 'Meknès'),
   'Marjane', 'appartement_r2', 'r2', 8, 8, 480000,
   'enseignant', 'proposition')

on conflict (id) do nothing;

-- --- Ouverture aux candidatures ---------------------------------------------
-- Les six premiers projets sont validés ; le septième (Fès) reste en analyse.
update public.projects
   set status = 'ouvert'
 where id in (
   '0d000000-0000-4000-8000-000000000001',
   '0d000000-0000-4000-8000-000000000002',
   '0d000000-0000-4000-8000-000000000003',
   '0d000000-0000-4000-8000-000000000004',
   '0d000000-0000-4000-8000-000000000005',
   '0d000000-0000-4000-8000-000000000007'
 )
 and status = 'proposition';

update public.projects set status = 'analyse'
 where id = '0d000000-0000-4000-8000-000000000006' and status = 'proposition';

-- --- Membres et candidatures -------------------------------------------------
-- Chaque projet reçoit ses membres confirmés puis ses candidatures en attente.
-- Le déclencheur `project_participants_lifecycle` bascule automatiquement en
-- « groupe constitué » dès que la cible est atteinte : c'est ce qui donne aux
-- projets (2), (4) et (7) leur statut final.

-- (1) Médecins — Casablanca : 14 confirmés sur 20 (70 %), 2 candidatures
insert into public.project_participants (project_id, participant_id, units_wanted, status, decided_at)
select '0d000000-0000-4000-8000-000000000001', sp.id, 1, 'accepte', now() - interval '20 days'
from seed_people sp where sp.idx between 1 and 14
on conflict (project_id, participant_id) do nothing;

insert into public.project_participants (project_id, participant_id, units_wanted, status, message)
select '0d000000-0000-4000-8000-000000000001', sp.id, 1, 'candidature',
       'Intéressé par un appartement de 100 m² environ.'
from seed_people sp where sp.idx between 15 and 16
on conflict (project_id, participant_id) do nothing;

-- (2) Enseignants — Rabat : 12 sur 12 → le déclencheur clôt le groupe
insert into public.project_participants (project_id, participant_id, units_wanted, status, decided_at)
select '0d000000-0000-4000-8000-000000000002', sp.id, 1, 'accepte', now() - interval '45 days'
from seed_people sp where sp.idx between 17 and 28
on conflict (project_id, participant_id) do nothing;

-- (3) Ingénieurs — Marrakech : 8 confirmés sur 18, le groupe reste ouvert
insert into public.project_participants (project_id, participant_id, units_wanted, status, decided_at)
select '0d000000-0000-4000-8000-000000000003', sp.id, 1, 'accepte', now() - interval '10 days'
from seed_people sp where sp.idx between 37 and 44
on conflict (project_id, participant_id) do nothing;

-- (4) Al Amal — Tanger : 14 sur 14, tous corps confondus → puis préparation
insert into public.project_participants (project_id, participant_id, units_wanted, status, decided_at)
select '0d000000-0000-4000-8000-000000000004', sp.id, 1, 'accepte', now() - interval '90 days'
from seed_people sp where sp.idx between 51 and 64
on conflict (project_id, participant_id) do nothing;

update public.projects set status = 'en_preparation'
 where id = '0d000000-0000-4000-8000-000000000004' and status = 'groupe_constitue';

-- (5) Mini-fermes — Agadir : 6 confirmés sur 10, 1 candidature en attente
insert into public.project_participants (project_id, participant_id, units_wanted, status, decided_at)
select '0d000000-0000-4000-8000-000000000005', sp.id, 1, 'accepte', now() - interval '5 days'
from seed_people sp where sp.idx between 59 and 64
on conflict (project_id, participant_id) do nothing;

insert into public.project_participants (project_id, participant_id, units_wanted, status, message)
select '0d000000-0000-4000-8000-000000000005', sp.id, 2, 'candidature',
       'Je souhaite deux parcelles contiguës.'
from seed_people sp where sp.idx = 65
on conflict (project_id, participant_id) do nothing;

-- (6) Pharmaciens — Fès : en analyse, seul le porteur est rattaché
insert into public.project_participants (project_id, participant_id, units_wanted, status, decided_at)
select '0d000000-0000-4000-8000-000000000006', sp.id, 1, 'accepte', now() - interval '3 days'
from seed_people sp where sp.idx = 45
on conflict (project_id, participant_id) do nothing;

-- (7) Bahia — Meknès : 8 sur 8 → constitué, puis préparation, puis réalisé
insert into public.project_participants (project_id, participant_id, units_wanted, status, decided_at)
select '0d000000-0000-4000-8000-000000000007', sp.id, 1, 'accepte', now() - interval '200 days'
from seed_people sp where sp.idx between 29 and 36
on conflict (project_id, participant_id) do nothing;

update public.projects set status = 'en_preparation'
 where id = '0d000000-0000-4000-8000-000000000007' and status = 'groupe_constitue';
update public.projects set status = 'realise'
 where id = '0d000000-0000-4000-8000-000000000007' and status = 'en_preparation';

-- Le projet réalisé a été ouvert il y a longtemps : on rétablit la date pour
-- que le KPI « temps moyen de constitution d'un groupe » ait du sens.
update public.projects set opened_at = now() - interval '230 days'
 where id = '0d000000-0000-4000-8000-000000000007';

commit;

-- =============================================================================
-- Récapitulatif
-- =============================================================================

select
  (select count(*) from public.regions)                                    as regions,
  (select count(*) from public.cities)                                     as villes,
  (select count(*) from public.land_listings where status = 'publie')      as terrains_publies,
  (select count(*) from public.participant_requests where status='active') as demandes_actives,
  (select count(*) from public.projects)                                   as projets_pilotes,
  (select count(*) from public.matches)                                    as correspondances,
  (select round(avg(score), 1) from public.matches)                        as score_moyen;

select p.title, p.status, p.units_planned as unites,
       (select count(*) from public.project_participants pp
         where pp.project_id = p.id and pp.status = 'accepte') || ' / ' ||
       p.participants_target as groupe
from public.projects p
order by p.reference;
