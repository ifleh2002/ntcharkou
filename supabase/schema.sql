-- =============================================================================
-- Ntcharkou — Schéma complet de la base
--
-- Ce fichier regroupe, dans l'ordre, les migrations de `supabase/migrations/`.
-- Il est destiné à une installation en une seule fois :
--
--   Tableau de bord Supabase → SQL Editor → coller ce fichier → Run
--
-- ou, en ligne de commande :
--
--   psql "$DATABASE_URL" -f supabase/schema.sql
--
-- Il crée :
--   · 17 tables, 14 énumérations métier et 3 vues publiques
--   · le moteur de matching (fonctions PL/pgSQL + déclencheurs)
--   · les règles Row Level Security et les privilèges de chaque rôle
--   · les fonctions de KPI du back-office
--   · le référentiel : 12 régions et 282 communes, en français et en arabe
--   · les 4 buckets de stockage et leurs politiques d'accès
--
-- Il ne crée AUCUN compte et AUCUNE donnée de démonstration : pour cela, voir
-- `supabase/seed.sql` (à réserver à un environnement de test).
--
-- ⚠ Ce fichier s'adresse à une base VIERGE. Sur une base déjà installée, il
--   s'arrête de lui-même avec un message : appliquez alors uniquement les
--   migrations manquantes de `supabase/migrations/` (ou `supabase db push`).
--
-- ⚠ Ne modifiez pas ce fichier à la main : il est régénéré depuis les
--   migrations par `npm run build:schema`. Toute correction se fait dans
--   `supabase/migrations/`, qui reste la source de vérité.
-- =============================================================================

begin;

-- --- Garde-fou ---------------------------------------------------------------
-- Rejouer ce fichier sur une base déjà installée échouait sur un message peu
-- parlant (« type "user_role" already exists ») après avoir déjà rejoué une
-- partie du schéma. On s'arrête donc franchement, avec la marche à suivre.
do $$
begin
  if exists (select 1 from pg_class where relname = 'land_listings' and relnamespace = 'public'::regnamespace) then
    raise exception using
      errcode = '42P07',
      message = 'La base Ntcharkou est déjà installée.',
      hint    = 'N''exécutez pas schema.sql, qui s''adresse à une base vierge. '
                'Appliquez uniquement les migrations manquantes de supabase/migrations/ '
                '(la plus récente d''abord), ou lancez « supabase db push ».';
  end if;
end;
$$;


-- ###########################################################################
-- # 20260810090000_schema.sql
-- ###########################################################################

-- =============================================================================
-- Ntcharkou — Place de marche du logement participatif au Maroc
-- Migration 1/5 : types, tables de reference et schema principal
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Enumerations metier
-- -----------------------------------------------------------------------------

create type public.user_role as enum ('participant', 'owner', 'admin');

create type public.owner_kind as enum (
  'particulier',   -- Proprietaire particulier
  'societe',       -- Societe
  'heritiers',     -- Heritiers / indivision
  'mandataire'     -- Mandataire
);

-- Type / zonage du terrain (etape 3 du formulaire proprietaire)
create type public.land_zoning as enum (
  'residentiel',
  'r2',
  'r3',
  'r4',
  'villa',
  'lotissement',
  'immeuble',
  'commercial',
  'industriel',
  'agricole',
  'autre'
);

create type public.legal_status as enum (
  'titre_foncier',   -- Titre foncier
  'requisition',     -- Requisition en cours d'immatriculation
  'melkia',          -- Melkia / acte adoulaire
  'habous',
  'collectif',
  'autre'
);

-- Workflow de validation d'un terrain (section 14)
create type public.listing_status as enum (
  'brouillon',
  'soumis',
  'en_verification',
  'valide',
  'publie',
  'refuse',
  'archive'
);

-- Workflow de validation d'un projet participatif (section 14)
create type public.project_status as enum (
  'proposition',
  'analyse',
  'validation_admin',
  'ouvert',
  'groupe_constitue',
  'en_preparation',
  'realise',
  'annule'
);

-- Besoin immobilier du participant (section 6)
create type public.property_need as enum (
  'appartement_immeuble',
  'appartement_r2',
  'appartement_residence_fermee',
  'terrain_r2',
  'terrain_r3',
  'terrain_r4',
  'terrain_villa',
  'mini_ferme',
  'villa_semi_finie',
  'terrain_industriel'
);

-- Corps / fonction professionnelle (section 5)
create type public.professional_body as enum (
  'medecin',
  'pharmacien',
  'enseignant',
  'ingenieur',
  'fonctionnaire',
  'entrepreneur',
  'cadre',
  'autre'
);

create type public.same_body_preference as enum ('oui', 'non', 'indifferent');

create type public.request_status as enum ('brouillon', 'active', 'en_pause', 'satisfaite', 'archivee');

create type public.match_status as enum ('nouveau', 'vu', 'interesse', 'refuse', 'converti');

create type public.participation_status as enum ('candidature', 'accepte', 'refuse', 'retire');

create type public.notification_kind as enum (
  'nouveau_match_terrain',   -- un terrain correspond a ma demande
  'nouveau_match_demande',   -- une demande correspond a mon terrain
  'terrain_valide',
  'terrain_refuse',
  'projet_ouvert',
  'candidature_recue',
  'candidature_acceptee',
  'candidature_refusee',
  'projet_complet',
  'systeme'
);

create type public.report_reason as enum (
  'annonce_frauduleuse',
  'prix_incoherent',
  'doublon',
  'contenu_inapproprie',
  'coordonnees_visibles',
  'autre'
);

-- -----------------------------------------------------------------------------
-- 2. Referentiel geographique (12 regions du Maroc + villes)
-- -----------------------------------------------------------------------------

create table public.regions (
  code        text primary key,
  name_fr     text not null,
  name_ar     text,
  sort_order  smallint not null default 0
);

create table public.cities (
  id           uuid primary key default gen_random_uuid(),
  region_code  text not null references public.regions(code) on delete restrict,
  name_fr      text not null,
  name_ar      text,
  is_major     boolean not null default false,
  unique (region_code, name_fr)
);

create index cities_region_idx on public.cities (region_code);

-- -----------------------------------------------------------------------------
-- 3. Profils
-- -----------------------------------------------------------------------------

-- Miroir applicatif de auth.users. Les coordonnees (telephone, email, CIN)
-- restent privees : jamais exposees dans les vues publiques.
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  role              public.user_role not null default 'participant',
  first_name        text not null default '',
  last_name         text not null default '',
  email             text,
  phone             text,
  region_code       text references public.regions(code) on delete set null,
  city_id           uuid references public.cities(id) on delete set null,
  district          text,                       -- quartier
  avatar_url        text,
  is_suspended      boolean not null default false,
  terms_accepted_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.profiles is
  'Profil applicatif. Les colonnes email/phone sont des donnees privees, jamais publiees.';

-- Donnees specifiques au proprietaire (etape 1 du formulaire terrain)
create table public.owner_profiles (
  profile_id        uuid primary key references public.profiles(id) on delete cascade,
  owner_kind        public.owner_kind not null default 'particulier',
  company_name      text,
  cin_number        text,                       -- prive : verification administrative uniquement
  cin_document_path text,                       -- Storage : bucket prive "documents"
  is_verified       boolean not null default false,
  verified_at       timestamptz,
  verified_by       uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Donnees specifiques au participant (section 5)
create table public.participant_profiles (
  profile_id           uuid primary key references public.profiles(id) on delete cascade,
  professional_status  text,                          -- situation professionnelle
  professional_body    public.professional_body not null default 'autre',
  professional_body_other text,
  employer             text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 4. Terrains
-- -----------------------------------------------------------------------------
-- Localisation, caracteristiques, prix et reseaux sont portes par la table
-- principale : le moteur de matching les interroge ensemble a chaque calcul,
-- des tables 1-1 separees n'apporteraient que des jointures supplementaires.
-- Les collections (images, documents) restent dans des tables dediees.

create table public.land_listings (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles(id) on delete cascade,
  reference        text unique,                       -- ex. TER-2026-000128
  title            text not null,
  description      text,

  -- Etape 2 : localisation
  region_code      text not null references public.regions(code) on delete restrict,
  city_id          uuid references public.cities(id) on delete set null,
  city_other       text,
  district         text,
  address          text,
  latitude         numeric(9, 6),
  longitude        numeric(9, 6),

  -- Etape 3 : caracteristiques
  zoning           public.land_zoning not null,
  surface_m2       numeric(12, 2) not null check (surface_m2 > 0),
  facade_m         numeric(8, 2),
  depth_m          numeric(8, 2),
  facade_count     smallint check (facade_count is null or facade_count between 1 and 8),
  road_width_m     numeric(6, 2),
  land_title_ref   text,                              -- reference du titre foncier
  legal_status     public.legal_status,
  observations     text,

  -- Etape 4 : prix
  price_per_m2     numeric(12, 2) check (price_per_m2 is null or price_per_m2 >= 0),
  total_price      numeric(14, 2)
                     generated always as (round(coalesce(price_per_m2, 0) * surface_m2, 2)) stored,
  price_negotiable boolean not null default false,

  -- Etape 5 : reseaux
  has_water        boolean not null default false,
  has_electricity  boolean not null default false,
  has_sewage       boolean not null default false,
  has_telecom      boolean not null default false,
  has_gas          boolean not null default false,
  network_other    text,

  -- Capacite : saisie par le proprietaire, sinon estimee (cf. migration matching)
  declared_units   integer check (declared_units is null or declared_units > 0),

  -- Workflow (section 14)
  status           public.listing_status not null default 'brouillon',
  submitted_at     timestamptz,
  published_at     timestamptz,
  reviewed_at      timestamptz,
  reviewed_by      uuid references public.profiles(id) on delete set null,
  rejection_reason text,

  view_count       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index land_listings_owner_idx     on public.land_listings (owner_id);
create index land_listings_status_idx    on public.land_listings (status);
create index land_listings_region_idx    on public.land_listings (region_code);
create index land_listings_city_idx      on public.land_listings (city_id);
create index land_listings_zoning_idx    on public.land_listings (zoning);
create index land_listings_published_idx on public.land_listings (published_at desc)
  where status = 'publie';

create table public.land_images (
  id           uuid primary key default gen_random_uuid(),
  land_id      uuid not null references public.land_listings(id) on delete cascade,
  storage_path text not null,                   -- bucket public "land-images"
  caption      text,
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now()
);

create index land_images_land_idx on public.land_images (land_id, sort_order);

-- Documents sensibles : titre foncier, note de renseignement, plan cadastral.
-- Bucket prive "land-documents" — visibles par le proprietaire et l'administration.
create table public.land_documents (
  id            uuid primary key default gen_random_uuid(),
  land_id       uuid not null references public.land_listings(id) on delete cascade,
  kind          text not null,                  -- plan | titre_foncier | note_urbanisme | cadastre | autre
  label         text,
  storage_path  text not null,
  uploaded_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index land_documents_land_idx on public.land_documents (land_id);

-- -----------------------------------------------------------------------------
-- 5. Demandes des participants
-- -----------------------------------------------------------------------------

create table public.participant_requests (
  id                      uuid primary key default gen_random_uuid(),
  participant_id          uuid not null references public.profiles(id) on delete cascade,
  reference               text unique,
  title                   text not null,
  notes                   text,

  -- Localisation souhaitee (region null = indifferent)
  region_code             text references public.regions(code) on delete set null,
  city_id                 uuid references public.cities(id) on delete set null,
  district                text,

  -- Besoin immobilier : plusieurs typologies possibles (section 6)
  property_needs          public.property_need[] not null default '{}',

  -- Budget (section 7) : on distingue enveloppe globale et budget par unite
  budget_total_min        numeric(14, 2) check (budget_total_min is null or budget_total_min >= 0),
  budget_total_max        numeric(14, 2) check (budget_total_max is null or budget_total_max >= 0),
  budget_per_unit_min     numeric(14, 2) check (budget_per_unit_min is null or budget_per_unit_min >= 0),
  budget_per_unit_max     numeric(14, 2) check (budget_per_unit_max is null or budget_per_unit_max >= 0),

  -- Nombre d'unites souhaitees (section 8)
  units_wanted            integer check (units_wanted is null or units_wanted > 0),

  -- Surface souhaitee (facultatif, affine le matching)
  surface_min_m2          numeric(12, 2),
  surface_max_m2          numeric(12, 2),

  -- Groupe professionnel (section 9)
  same_body_preference    public.same_body_preference not null default 'indifferent',
  preferred_body          public.professional_body,

  -- Reseaux consideres comme indispensables
  requires_water          boolean not null default false,
  requires_electricity    boolean not null default false,
  requires_sewage         boolean not null default false,

  status                  public.request_status not null default 'active',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint budget_total_coherent
    check (budget_total_min is null or budget_total_max is null or budget_total_min <= budget_total_max),
  constraint budget_unit_coherent
    check (budget_per_unit_min is null or budget_per_unit_max is null
           or budget_per_unit_min <= budget_per_unit_max),
  constraint surface_coherent
    check (surface_min_m2 is null or surface_max_m2 is null or surface_min_m2 <= surface_max_m2)
);

create index participant_requests_participant_idx on public.participant_requests (participant_id);
create index participant_requests_status_idx      on public.participant_requests (status);
create index participant_requests_region_idx      on public.participant_requests (region_code);
create index participant_requests_needs_idx       on public.participant_requests using gin (property_needs);

-- -----------------------------------------------------------------------------
-- 6. Projets participatifs et groupes
-- -----------------------------------------------------------------------------

create table public.projects (
  id                   uuid primary key default gen_random_uuid(),
  reference            text unique,
  title                text not null,
  summary              text,
  description          text,

  created_by           uuid references public.profiles(id) on delete set null,
  land_id              uuid references public.land_listings(id) on delete set null,

  region_code          text not null references public.regions(code) on delete restrict,
  city_id              uuid references public.cities(id) on delete set null,
  district             text,

  property_need        public.property_need not null,
  zoning               public.land_zoning,

  units_planned        integer not null check (units_planned > 0),
  participants_target  integer not null check (participants_target > 0),
  budget_per_unit      numeric(14, 2),

  -- Groupe professionnel (section 26 : "Creer mon groupe")
  restricted_to_body   public.professional_body,

  status               public.project_status not null default 'proposition',
  opened_at            timestamptz,
  reviewed_at          timestamptz,
  reviewed_by          uuid references public.profiles(id) on delete set null,
  rejection_reason     text,
  cover_image_path     text,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index projects_status_idx on public.projects (status);
create index projects_region_idx on public.projects (region_code);
create index projects_land_idx   on public.projects (land_id);

create table public.project_participants (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  request_id     uuid references public.participant_requests(id) on delete set null,
  units_wanted   integer not null default 1 check (units_wanted > 0),
  message        text,
  status         public.participation_status not null default 'candidature',
  decided_at     timestamptz,
  decided_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (project_id, participant_id)
);

create index project_participants_project_idx     on public.project_participants (project_id);
create index project_participants_participant_idx on public.project_participants (participant_id);

create table public.project_documents (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  kind         text not null,
  label        text,
  storage_path text not null,
  is_public    boolean not null default false,
  uploaded_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index project_documents_project_idx on public.project_documents (project_id);

-- -----------------------------------------------------------------------------
-- 7. Matching
-- -----------------------------------------------------------------------------

create table public.matches (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.participant_requests(id) on delete cascade,
  land_id       uuid not null references public.land_listings(id) on delete cascade,
  score         numeric(5, 2) not null check (score >= 0 and score <= 100),
  breakdown     jsonb not null default '{}'::jsonb,   -- detail par critere
  status        public.match_status not null default 'nouveau',
  notified_at   timestamptz,
  viewed_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (request_id, land_id)
);

create index matches_request_idx on public.matches (request_id, score desc);
create index matches_land_idx    on public.matches (land_id, score desc);
create index matches_score_idx   on public.matches (score desc);

-- -----------------------------------------------------------------------------
-- 8. Favoris, notifications, moderation
-- -----------------------------------------------------------------------------

create table public.favorites (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  land_id     uuid references public.land_listings(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint favorite_target_exclusif
    check (num_nonnulls(land_id, project_id) = 1)
);

create unique index favorites_land_unique    on public.favorites (profile_id, land_id)
  where land_id is not null;
create unique index favorites_project_unique on public.favorites (profile_id, project_id)
  where project_id is not null;

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  kind        public.notification_kind not null,
  title       text not null,
  body        text,
  url         text,
  payload     jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  email_sent_at timestamptz,
  created_at  timestamptz not null default now()
);

create index notifications_profile_idx on public.notifications (profile_id, created_at desc);
create index notifications_unread_idx  on public.notifications (profile_id)
  where read_at is null;

create table public.admin_actions (
  id           uuid primary key default gen_random_uuid(),
  admin_id     uuid references public.profiles(id) on delete set null,
  action       text not null,                   -- ex. land.publish, project.open, user.suspend
  entity_type  text not null,
  entity_id    uuid,
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index admin_actions_created_idx on public.admin_actions (created_at desc);
create index admin_actions_entity_idx  on public.admin_actions (entity_type, entity_id);

create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid references public.profiles(id) on delete set null,
  land_id       uuid references public.land_listings(id) on delete cascade,
  project_id    uuid references public.projects(id) on delete cascade,
  reason        public.report_reason not null,
  details       text,
  resolved_at   timestamptz,
  resolved_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint report_target_exclusif
    check (num_nonnulls(land_id, project_id) = 1)
);

create index reports_open_idx on public.reports (created_at desc) where resolved_at is null;

-- -----------------------------------------------------------------------------
-- 9. Horodatage automatique
-- -----------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'owner_profiles', 'participant_profiles', 'land_listings',
    'participant_requests', 'projects', 'matches'
  ]
  loop
    execute format(
      'create trigger %I_touch_updated_at before update on public.%I
         for each row execute function public.touch_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 10. References lisibles (TER-2026-000128, DEM-…, PRJ-…)
-- -----------------------------------------------------------------------------

create sequence public.land_reference_seq;
create sequence public.request_reference_seq;
create sequence public.project_reference_seq;

create or replace function public.assign_reference()
returns trigger
language plpgsql
as $$
declare
  prefix text := tg_argv[0];
  seq    text := tg_argv[1];
begin
  if new.reference is null then
    new.reference := format(
      '%s-%s-%s',
      prefix,
      to_char(now(), 'YYYY'),
      lpad(nextval(seq)::text, 6, '0')
    );
  end if;
  return new;
end;
$$;

create trigger land_listings_reference before insert on public.land_listings
  for each row execute function public.assign_reference('TER', 'public.land_reference_seq');

create trigger participant_requests_reference before insert on public.participant_requests
  for each row execute function public.assign_reference('DEM', 'public.request_reference_seq');

create trigger projects_reference before insert on public.projects
  for each row execute function public.assign_reference('PRJ', 'public.project_reference_seq');

-- -----------------------------------------------------------------------------
-- 11. Creation automatique du profil a l'inscription
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted_role public.user_role;
begin
  wanted_role := case new.raw_user_meta_data ->> 'role'
                   when 'owner' then 'owner'::public.user_role
                   else 'participant'::public.user_role
                 end;

  insert into public.profiles (id, role, first_name, last_name, email, phone, terms_accepted_at)
  values (
    new.id,
    wanted_role,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    now()
  )
  on conflict (id) do nothing;

  if wanted_role = 'owner' then
    insert into public.owner_profiles (profile_id) values (new.id)
      on conflict (profile_id) do nothing;
  else
    insert into public.participant_profiles (profile_id) values (new.id)
      on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ###########################################################################
-- # 20260810091000_matching.sql
-- ###########################################################################

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

-- ###########################################################################
-- # 20260810092000_rls.sql
-- ###########################################################################

-- =============================================================================
-- Ntcharkou — Migration 3/5 : Row Level Security, vues publiques, stockage
--
-- Principe : les coordonnees personnelles (telephone, email, CIN, documents
-- juridiques) ne sortent jamais de la base pour un visiteur ou un autre
-- utilisateur. Le public ne voit que des projections explicites.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Fonctions d'aide (security definer : evitent la recursion dans les regles)
-- -----------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not is_suspended
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and not is_suspended
  );
$$;

-- Empeche l'auto-promotion : seul un administrateur peut changer un role
-- ou lever une suspension.
--
-- `auth.uid() is null` signale un contexte serveur (service_role, console SQL,
-- migration) : aucune requete d'utilisateur final ne peut l'atteindre, la
-- politique de mise a jour de `profiles` exigeant deja `id = auth.uid()`.
-- C'est ce chemin qui permet de designer le tout premier administrateur.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;
  new.role         := old.role;
  new.is_suspended := old.is_suspended;
  return new;
end;
$$;

create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- Le passage a "valide" / "publie" / "refuse" reste une decision administrative.
create or replace function public.guard_listing_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.uid() is null then
    if new.status is distinct from old.status then
      new.reviewed_at := now();
      new.reviewed_by := auth.uid();
      if new.status = 'publie' and new.published_at is null then
        new.published_at := now();
      end if;
    end if;
    return new;
  end if;

  -- Le proprietaire ne peut que soumettre (brouillon -> soumis) ou revenir au
  -- brouillon tant que le dossier n'est pas en cours de verification.
  if new.status is distinct from old.status then
    if old.status in ('brouillon', 'refuse') and new.status = 'soumis' then
      new.submitted_at := now();
    elsif old.status = 'soumis' and new.status = 'brouillon' then
      new.submitted_at := null;
    elsif new.status = 'archive' and old.status in ('brouillon', 'refuse', 'publie') then
      null;   -- le proprietaire peut retirer son annonce
    else
      raise exception 'Changement de statut non autorise : % -> %', old.status, new.status
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger land_listings_guard_status
  before update on public.land_listings
  for each row execute function public.guard_listing_status();

create or replace function public.guard_project_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.uid() is null then
    if new.status is distinct from old.status then
      new.reviewed_at := now();
      new.reviewed_by := auth.uid();
      if new.status = 'ouvert' and new.opened_at is null then
        new.opened_at := now();
      end if;
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if old.status = 'proposition' and new.status = 'analyse' then
      null;   -- le porteur soumet son groupe a l'analyse
    elsif new.status = 'annule' and old.status in ('proposition', 'analyse') then
      null;
    else
      raise exception 'Changement de statut non autorise : % -> %', old.status, new.status
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger projects_guard_status
  before update on public.projects
  for each row execute function public.guard_project_status();

-- -----------------------------------------------------------------------------
-- 2. Activation de RLS
-- -----------------------------------------------------------------------------

alter table public.regions              enable row level security;
alter table public.cities               enable row level security;
alter table public.profiles             enable row level security;
alter table public.owner_profiles       enable row level security;
alter table public.participant_profiles enable row level security;
alter table public.land_listings        enable row level security;
alter table public.land_images          enable row level security;
alter table public.land_documents       enable row level security;
alter table public.participant_requests enable row level security;
alter table public.projects             enable row level security;
alter table public.project_participants enable row level security;
alter table public.project_documents    enable row level security;
alter table public.matches              enable row level security;
alter table public.favorites            enable row level security;
alter table public.notifications        enable row level security;
alter table public.admin_actions        enable row level security;
alter table public.reports              enable row level security;

-- -----------------------------------------------------------------------------
-- 3. Referentiel : lecture publique
-- -----------------------------------------------------------------------------

create policy "regions lisibles par tous" on public.regions
  for select using (true);

create policy "villes lisibles par tous" on public.cities
  for select using (true);

create policy "regions administrables" on public.regions
  for all using (public.is_admin()) with check (public.is_admin());

create policy "villes administrables" on public.cities
  for all using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4. Profils
-- -----------------------------------------------------------------------------

create policy "profil : lecture de son propre profil" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "profil : creation a l'inscription" on public.profiles
  for insert with check (id = auth.uid());

create policy "profil : mise a jour de son propre profil" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "profil proprietaire : lecture" on public.owner_profiles
  for select using (profile_id = auth.uid() or public.is_admin());

create policy "profil proprietaire : ecriture" on public.owner_profiles
  for all using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

create policy "profil participant : lecture" on public.participant_profiles
  for select using (profile_id = auth.uid() or public.is_admin());

create policy "profil participant : ecriture" on public.participant_profiles
  for all using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

-- -----------------------------------------------------------------------------
-- 5. Terrains
-- -----------------------------------------------------------------------------

create policy "terrains publies visibles par tous" on public.land_listings
  for select using (
    status = 'publie'
    or owner_id = auth.uid()
    or public.is_admin()
  );

create policy "terrain : depot par un utilisateur actif" on public.land_listings
  for insert with check (
    owner_id = auth.uid()
    and public.is_active_user()
    and status in ('brouillon', 'soumis')
  );

create policy "terrain : modification par le proprietaire" on public.land_listings
  for update using (
    (owner_id = auth.uid() and status <> 'en_verification')
    or public.is_admin()
  )
  with check (owner_id = auth.uid() or public.is_admin());

create policy "terrain : suppression d'un brouillon" on public.land_listings
  for delete using (
    (owner_id = auth.uid() and status in ('brouillon', 'refuse'))
    or public.is_admin()
  );

-- Photos : visibles des lors que le terrain l'est
create policy "photos : lecture" on public.land_images
  for select using (
    exists (
      select 1 from public.land_listings l
      where l.id = land_images.land_id
        and (l.status = 'publie' or l.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy "photos : gestion par le proprietaire" on public.land_images
  for all using (
    exists (
      select 1 from public.land_listings l
      where l.id = land_images.land_id
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.land_listings l
      where l.id = land_images.land_id
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  );

-- Documents sensibles : proprietaire + administration uniquement
create policy "documents terrain : lecture restreinte" on public.land_documents
  for select using (
    exists (
      select 1 from public.land_listings l
      where l.id = land_documents.land_id
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy "documents terrain : gestion" on public.land_documents
  for all using (
    exists (
      select 1 from public.land_listings l
      where l.id = land_documents.land_id
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.land_listings l
      where l.id = land_documents.land_id
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  );

-- -----------------------------------------------------------------------------
-- 6. Demandes : strictement privees (participant + administration)
-- -----------------------------------------------------------------------------

create policy "demande : lecture par son auteur" on public.participant_requests
  for select using (participant_id = auth.uid() or public.is_admin());

create policy "demande : creation" on public.participant_requests
  for insert with check (participant_id = auth.uid() and public.is_active_user());

create policy "demande : mise a jour" on public.participant_requests
  for update using (participant_id = auth.uid() or public.is_admin())
  with check (participant_id = auth.uid() or public.is_admin());

create policy "demande : suppression" on public.participant_requests
  for delete using (participant_id = auth.uid() or public.is_admin());

-- -----------------------------------------------------------------------------
-- 7. Projets participatifs
-- -----------------------------------------------------------------------------

create policy "projet : lecture" on public.projects
  for select using (
    status in ('ouvert', 'groupe_constitue', 'en_preparation', 'realise')
    or created_by = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.project_participants pp
      where pp.project_id = projects.id and pp.participant_id = auth.uid()
    )
  );

create policy "projet : creation d'un groupe" on public.projects
  for insert with check (
    created_by = auth.uid()
    and public.is_active_user()
    and status in ('proposition', 'analyse')
  );

create policy "projet : mise a jour" on public.projects
  for update using (
    (created_by = auth.uid() and status in ('proposition', 'analyse'))
    or public.is_admin()
  )
  with check (created_by = auth.uid() or public.is_admin());

create policy "projet : suppression d'une proposition" on public.projects
  for delete using (
    (created_by = auth.uid() and status = 'proposition') or public.is_admin()
  );

create policy "participation : lecture" on public.project_participants
  for select using (
    participant_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = project_participants.project_id and p.created_by = auth.uid()
    )
  );

create policy "participation : candidature" on public.project_participants
  for insert with check (
    participant_id = auth.uid()
    and public.is_active_user()
    and status = 'candidature'
    and exists (
      select 1 from public.projects p
      where p.id = project_participants.project_id and p.status = 'ouvert'
    )
  );

create policy "participation : mise a jour" on public.project_participants
  for update using (
    participant_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = project_participants.project_id and p.created_by = auth.uid()
    )
  )
  with check (
    participant_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = project_participants.project_id and p.created_by = auth.uid()
    )
  );

create policy "participation : retrait" on public.project_participants
  for delete using (participant_id = auth.uid() or public.is_admin());

create policy "documents projet : lecture" on public.project_documents
  for select using (
    (is_public and exists (
      select 1 from public.projects p
      where p.id = project_documents.project_id
        and p.status in ('ouvert', 'groupe_constitue', 'en_preparation', 'realise')
    ))
    or public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = project_documents.project_id and p.created_by = auth.uid()
    )
  );

create policy "documents projet : gestion" on public.project_documents
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = project_documents.project_id and p.created_by = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = project_documents.project_id and p.created_by = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 8. Matching, favoris, notifications
-- -----------------------------------------------------------------------------

-- Un participant voit les correspondances de ses propres demandes.
-- Un proprietaire ne voit jamais la demande : il passe par la vue anonymisee.
create policy "match : lecture par le demandeur" on public.matches
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.participant_requests r
      where r.id = matches.request_id and r.participant_id = auth.uid()
    )
  );

create policy "match : mise a jour du statut par le demandeur" on public.matches
  for update using (
    public.is_admin()
    or exists (
      select 1 from public.participant_requests r
      where r.id = matches.request_id and r.participant_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.participant_requests r
      where r.id = matches.request_id and r.participant_id = auth.uid()
    )
  );

create policy "favoris : gestion personnelle" on public.favorites
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "notifications : lecture personnelle" on public.notifications
  for select using (profile_id = auth.uid() or public.is_admin());

create policy "notifications : marquage comme lue" on public.notifications
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "notifications : creation par l'administration" on public.notifications
  for insert with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 9. Moderation
-- -----------------------------------------------------------------------------

create policy "journal admin : reserve" on public.admin_actions
  for select using (public.is_admin());

create policy "journal admin : ecriture" on public.admin_actions
  for insert with check (public.is_admin());

create policy "signalement : depot" on public.reports
  for insert with check (reporter_id = auth.uid() and public.is_active_user());

create policy "signalement : lecture" on public.reports
  for select using (reporter_id = auth.uid() or public.is_admin());

create policy "signalement : traitement" on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 10. Projections publiques
-- -----------------------------------------------------------------------------

-- Identite reduite : ni email, ni telephone, ni CIN.
create view public.public_profiles as
  select
    p.id,
    p.first_name,
    left(coalesce(nullif(p.last_name, ''), ' '), 1) || '.' as last_initial,
    p.role,
    p.region_code,
    p.city_id,
    p.avatar_url,
    pp.professional_body
  from public.profiles p
  left join public.participant_profiles pp on pp.profile_id = p.id
  where not p.is_suspended;

alter view public.public_profiles set (security_invoker = off);
grant select on public.public_profiles to anon, authenticated;

-- Fiche terrain enrichie (noms de region/ville, capacite, photo de couverture).
create view public.land_listings_public
with (security_invoker = on) as
  select
    l.id,
    l.reference,
    l.title,
    l.description,
    l.region_code,
    r.name_fr                       as region_name,
    l.city_id,
    coalesce(c.name_fr, l.city_other) as city_name,
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

-- Avancement d'un projet participatif.
create view public.projects_public
with (security_invoker = on) as
  select
    p.id,
    p.reference,
    p.title,
    p.summary,
    p.description,
    p.region_code,
    r.name_fr                        as region_name,
    p.city_id,
    c.name_fr                        as city_name,
    p.district,
    p.property_need,
    p.zoning,
    p.units_planned,
    p.participants_target,
    p.budget_per_unit,
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
    ) as participants_pending
  from public.projects p
  join public.regions r on r.code = p.region_code
  left join public.cities c on c.id = p.city_id;

grant select on public.projects_public to anon, authenticated;

-- Cote proprietaire : "votre terrain interesse 4 demandes", sans jamais
-- reveler qui est derriere la demande.
create or replace function public.owner_land_demand_summary(p_land uuid)
returns table (
  match_count       bigint,
  average_score     numeric,
  best_score        numeric,
  total_units_wanted bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint,
    round(avg(m.score), 1),
    max(m.score),
    coalesce(sum(r.units_wanted), 0)::bigint
  from public.matches m
  join public.participant_requests r on r.id = m.request_id
  join public.land_listings l on l.id = m.land_id
  where m.land_id = p_land
    and m.score >= public.match_notify_score()
    and r.status = 'active'
    and (l.owner_id = auth.uid() or public.is_admin());
$$;

-- -----------------------------------------------------------------------------
-- 11. Stockage
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('land-images',       'land-images',       true),
  ('avatars',           'avatars',           true),
  ('land-documents',    'land-documents',    false),
  ('project-documents', 'project-documents', false)
on conflict (id) do nothing;

-- Photos de terrains : lecture publique, ecriture par l'utilisateur dans son
-- propre dossier (<uid>/<land_id>/<fichier>).
create policy "photos terrain : lecture publique" on storage.objects
  for select using (bucket_id in ('land-images', 'avatars'));

create policy "photos terrain : depot personnel" on storage.objects
  for insert with check (
    bucket_id in ('land-images', 'avatars')
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "photos terrain : suppression personnelle" on storage.objects
  for delete using (
    bucket_id in ('land-images', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Documents : jamais publics.
create policy "documents : lecture restreinte" on storage.objects
  for select using (
    bucket_id in ('land-documents', 'project-documents')
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

create policy "documents : depot personnel" on storage.objects
  for insert with check (
    bucket_id in ('land-documents', 'project-documents')
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents : suppression" on storage.objects
  for delete using (
    bucket_id in ('land-documents', 'project-documents')
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ###########################################################################
-- # 20260810093000_analytics.sql
-- ###########################################################################

-- =============================================================================
-- Ntcharkou — Migration 4/5 : KPI, statistiques et automatismes des projets
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Vie du groupe : candidatures, notifications, constitution automatique
-- -----------------------------------------------------------------------------

create or replace function public.trg_project_participation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  proj      public.projects;
  confirmed integer;
begin
  select * into proj from public.projects where id = coalesce(new.project_id, old.project_id);
  if not found then
    return coalesce(new, old);
  end if;

  -- Le porteur du projet est prevenu de chaque candidature.
  if tg_op = 'INSERT' and proj.created_by is not null and proj.created_by <> new.participant_id then
    insert into public.notifications (profile_id, kind, title, body, url, payload)
    values (
      proj.created_by,
      'candidature_recue',
      'Nouvelle candidature sur votre projet',
      format('Une candidature vient d''etre deposee sur « %s ».', proj.title),
      '/mes-projets/' || proj.id,
      jsonb_build_object('project_id', proj.id, 'participation_id', new.id)
    );
  end if;

  -- Le candidat est prevenu de la decision.
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'accepte' then
      insert into public.notifications (profile_id, kind, title, body, url, payload)
      values (new.participant_id, 'candidature_acceptee',
              'Votre candidature est acceptee',
              format('Vous rejoignez le projet « %s ».', proj.title),
              '/projets/' || proj.id,
              jsonb_build_object('project_id', proj.id));
    elsif new.status = 'refuse' then
      insert into public.notifications (profile_id, kind, title, body, url, payload)
      values (new.participant_id, 'candidature_refusee',
              'Votre candidature n''a pas ete retenue',
              format('Projet « %s ».', proj.title),
              '/projets/' || proj.id,
              jsonb_build_object('project_id', proj.id));
    end if;
  end if;

  -- Groupe complet -> le projet bascule automatiquement.
  select count(*) into confirmed
  from public.project_participants
  where project_id = proj.id and status = 'accepte';

  if proj.status = 'ouvert' and confirmed >= proj.participants_target then
    update public.projects set status = 'groupe_constitue' where id = proj.id;

    insert into public.notifications (profile_id, kind, title, body, url, payload)
    select pp.participant_id, 'projet_complet'::public.notification_kind,
           'Le groupe est au complet',
           format('Le projet « %s » a reuni ses %s participants.', proj.title, proj.participants_target),
           '/projets/' || proj.id,
           jsonb_build_object('project_id', proj.id)
    from public.project_participants pp
    where pp.project_id = proj.id and pp.status = 'accepte';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger project_participants_lifecycle
  after insert or update on public.project_participants
  for each row execute function public.trg_project_participation();

-- Notification du proprietaire lors de la decision administrative sur un terrain.
create or replace function public.trg_land_status_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    if new.status = 'publie' then
      insert into public.notifications (profile_id, kind, title, body, url, payload)
      values (new.owner_id, 'terrain_valide',
              'Votre terrain est publie',
              format('« %s » est desormais visible par les participants.', new.title),
              '/terrains/' || new.id,
              jsonb_build_object('land_id', new.id));
    elsif new.status = 'refuse' then
      insert into public.notifications (profile_id, kind, title, body, url, payload)
      values (new.owner_id, 'terrain_refuse',
              'Votre terrain n''a pas ete valide',
              coalesce(new.rejection_reason, 'Consultez le detail de votre annonce.'),
              '/mes-terrains/' || new.id,
              jsonb_build_object('land_id', new.id));
    end if;
  end if;
  return new;
end;
$$;

create trigger land_listings_status_notification
  after update on public.land_listings
  for each row execute function public.trg_land_status_notification();

-- Ouverture d'un projet : les participants dont la demande colle sont prevenus.
create or replace function public.trg_project_opened_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status and new.status = 'ouvert' then
    insert into public.notifications (profile_id, kind, title, body, url, payload)
    select distinct r.participant_id, 'projet_ouvert'::public.notification_kind,
           'Un projet participatif correspond a votre demande',
           format('« %s » — %s unites, %s participants recherches.',
                  new.title, new.units_planned, new.participants_target),
           '/projets/' || new.id,
           jsonb_build_object('project_id', new.id)
    from public.participant_requests r
    where r.status = 'active'
      and (r.region_code is null or r.region_code = new.region_code)
      and (cardinality(r.property_needs) = 0 or new.property_need = any (r.property_needs))
      and (new.restricted_to_body is null
           or r.preferred_body is null
           or r.preferred_body = new.restricted_to_body);
  end if;
  return new;
end;
$$;

create trigger projects_opened_notification
  after update on public.projects
  for each row execute function public.trg_project_opened_notification();

-- -----------------------------------------------------------------------------
-- 2. Compteur de vues (appelable par un visiteur anonyme)
-- -----------------------------------------------------------------------------

create or replace function public.increment_land_views(p_land uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.land_listings
     set view_count = view_count + 1
   where id = p_land and status = 'publie';
$$;

grant execute on function public.increment_land_views(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. KPI du tableau de bord administrateur (section 15)
-- -----------------------------------------------------------------------------

create or replace function public.admin_kpis()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acces reserve a l''administration' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'terrains',            (select count(*) from public.land_listings where status = 'publie'),
    'terrains_en_attente', (select count(*) from public.land_listings
                             where status in ('soumis', 'en_verification')),
    'terrains_total',      (select count(*) from public.land_listings),
    'participants',        (select count(*) from public.profiles where role = 'participant'),
    'proprietaires',       (select count(*) from public.profiles where role = 'owner'),
    'demandes_actives',    (select count(*) from public.participant_requests where status = 'active'),
    'projets_valides',     (select count(*) from public.projects
                             where status in ('ouvert', 'groupe_constitue', 'en_preparation', 'realise')),
    'projets_en_attente',  (select count(*) from public.projects
                             where status in ('proposition', 'analyse', 'validation_admin')),
    'groupes_constitues',  (select count(*) from public.projects
                             where status in ('groupe_constitue', 'en_preparation', 'realise')),
    'matchings',           (select count(*) from public.matches),
    'matchings_pertinents',(select count(*) from public.matches
                             where score >= public.match_notify_score()),
    'score_moyen',         (select round(coalesce(avg(score), 0), 1) from public.matches),
    'signalements_ouverts',(select count(*) from public.reports where resolved_at is null),
    'taux_conversion',     (
       select case when count(*) = 0 then 0
              else round(count(*) filter (where status in ('interesse', 'converti'))::numeric
                         * 100 / count(*), 1)
              end
       from public.matches
    )
  ) into result;

  return result;
end;
$$;

-- Evolution des inscriptions (section 16)
create or replace function public.admin_signups_by_month(months integer default 12)
returns table (month date, participants bigint, proprietaires bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.month::date,
    count(*) filter (where p.role = 'participant')::bigint,
    count(*) filter (where p.role = 'owner')::bigint
  from generate_series(
         date_trunc('month', now()) - make_interval(months => greatest(months, 1) - 1),
         date_trunc('month', now()),
         interval '1 month'
       ) as m(month)
  left join public.profiles p
    on date_trunc('month', p.created_at) = m.month
   and public.is_admin()
  group by m.month
  order by m.month;
$$;

-- Terrains par region (section 16)
create or replace function public.admin_lands_by_region()
returns table (region_code text, region_name text, total bigint, published bigint)
language sql
stable
security definer
set search_path = public
as $$
  select r.code, r.name_fr,
         count(l.id)::bigint,
         count(l.id) filter (where l.status = 'publie')::bigint
  from public.regions r
  left join public.land_listings l on l.region_code = r.code
  where public.is_admin()
  group by r.code, r.name_fr, r.sort_order
  order by r.sort_order;
$$;

-- Demande par typologie (section 16)
create or replace function public.admin_requests_by_type()
returns table (property_need public.property_need, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select n.need, count(*)::bigint
  from public.participant_requests r
  cross join lateral unnest(r.property_needs) as n(need)
  where r.status = 'active' and public.is_admin()
  group by n.need
  order by 2 desc;
$$;

-- Distribution des budgets (section 16)
create or replace function public.admin_budget_distribution()
returns table (bucket text, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  with b as (
    select case
             when coalesce(budget_total_max, budget_per_unit_max * coalesce(units_wanted, 1)) < 500000
               then '< 500k'
             when coalesce(budget_total_max, budget_per_unit_max * coalesce(units_wanted, 1)) < 1000000
               then '500k - 1M'
             when coalesce(budget_total_max, budget_per_unit_max * coalesce(units_wanted, 1)) < 2000000
               then '1M - 2M'
             when coalesce(budget_total_max, budget_per_unit_max * coalesce(units_wanted, 1)) < 5000000
               then '2M - 5M'
             else '> 5M'
           end as bucket
    from public.participant_requests
    where status = 'active'
      and coalesce(budget_total_max, budget_per_unit_max * coalesce(units_wanted, 1)) is not null
  )
  select o.bucket, coalesce(count(b.bucket), 0)::bigint
  from (values ('< 500k', 1), ('500k - 1M', 2), ('1M - 2M', 3), ('2M - 5M', 4), ('> 5M', 5))
       as o(bucket, ord)
  left join b on b.bucket = o.bucket
  where public.is_admin()
  group by o.bucket, o.ord
  order by o.ord;
$$;

-- KPI metier terrains (section 17)
create or replace function public.admin_land_kpis()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acces reserve a l''administration' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'prix_moyen_m2',   round(coalesce(avg(price_per_m2), 0), 0),
    'surface_moyenne', round(coalesce(avg(surface_m2), 0), 0),
    'pct_eau',         round(coalesce(avg((has_water)::int), 0) * 100, 1),
    'pct_electricite', round(coalesce(avg((has_electricity)::int), 0) * 100, 1),
    'pct_assainissement', round(coalesce(avg((has_sewage)::int), 0) * 100, 1),
    'par_zonage', coalesce((
      select jsonb_object_agg(zoning, n)
      from (select zoning::text, count(*) as n
            from public.land_listings where status = 'publie'
            group by zoning) z
    ), '{}'::jsonb)
  ) into result
  from public.land_listings
  where status = 'publie';

  return result;
end;
$$;

-- KPI metier projets (section 17)
create or replace function public.admin_project_kpis()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acces reserve a l''administration' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'projets_ouverts',   count(*) filter (where status = 'ouvert'),
    'projets_complets',  count(*) filter (where status in ('groupe_constitue', 'en_preparation', 'realise')),
    'projets_annules',   count(*) filter (where status = 'annule'),
    'taux_abandon',      case when count(*) = 0 then 0
                              else round(count(*) filter (where status = 'annule')::numeric * 100 / count(*), 1)
                         end,
    'participants_moyen', coalesce((
        select round(avg(c), 1) from (
          select count(*) as c from public.project_participants
          where status = 'accepte' group by project_id
        ) t
      ), 0),
    'jours_pour_constituer', coalesce((
        select round(avg(extract(epoch from (
                 (select max(pp.decided_at) from public.project_participants pp
                   where pp.project_id = p.id and pp.status = 'accepte')
                 - p.opened_at)) / 86400), 1)
        from public.projects p
        where p.status in ('groupe_constitue', 'en_preparation', 'realise')
          and p.opened_at is not null
      ), 0)
  ) into result
  from public.projects;

  return result;
end;
$$;

-- KPI matching (section 17)
create or replace function public.admin_matching_kpis()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acces reserve a l''administration' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total',            count(*),
    'score_moyen',      round(coalesce(avg(score), 0), 1),
    'excellents',       count(*) filter (where score >= 90),
    'tres_bons',        count(*) filter (where score >= 75 and score < 90),
    'interessants',     count(*) filter (where score >= 60 and score < 75),
    'faibles',          count(*) filter (where score < 60),
    'notifies',         count(*) filter (where notified_at is not null),
    'vus',              count(*) filter (where viewed_at is not null),
    'interesses',       count(*) filter (where status = 'interesse'),
    'convertis',        count(*) filter (where status = 'converti'),
    'taux_ouverture',   case when count(*) filter (where notified_at is not null) = 0 then 0
                             else round(count(*) filter (where viewed_at is not null)::numeric * 100
                                        / count(*) filter (where notified_at is not null), 1)
                        end
  ) into result
  from public.matches;

  return result;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Actions administratives outillees (journalisees)
-- -----------------------------------------------------------------------------

create or replace function public.admin_review_land(
  p_land   uuid,
  p_status public.listing_status,
  p_reason text default null
)
returns public.land_listings
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.land_listings;
begin
  if not public.is_admin() then
    raise exception 'Acces reserve a l''administration' using errcode = '42501';
  end if;

  update public.land_listings
     set status = p_status,
         rejection_reason = case when p_status = 'refuse' then p_reason else null end
   where id = p_land
  returning * into updated;

  if not found then
    raise exception 'Terrain introuvable';
  end if;

  insert into public.admin_actions (admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'land.' || p_status::text, 'land_listing', p_land,
          jsonb_build_object('reason', p_reason));

  return updated;
end;
$$;

create or replace function public.admin_review_project(
  p_project uuid,
  p_status  public.project_status,
  p_reason  text default null
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.projects;
begin
  if not public.is_admin() then
    raise exception 'Acces reserve a l''administration' using errcode = '42501';
  end if;

  update public.projects
     set status = p_status,
         rejection_reason = case when p_status = 'annule' then p_reason else null end
   where id = p_project
  returning * into updated;

  if not found then
    raise exception 'Projet introuvable';
  end if;

  insert into public.admin_actions (admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'project.' || p_status::text, 'project', p_project,
          jsonb_build_object('reason', p_reason));

  return updated;
end;
$$;

create or replace function public.admin_set_user_suspended(p_profile uuid, p_suspended boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acces reserve a l''administration' using errcode = '42501';
  end if;

  update public.profiles set is_suspended = p_suspended where id = p_profile;

  insert into public.admin_actions (admin_id, action, entity_type, entity_id, details)
  values (auth.uid(),
          case when p_suspended then 'user.suspend' else 'user.restore' end,
          'profile', p_profile, '{}'::jsonb);
end;
$$;

-- Liste administrateur des utilisateurs (contourne la RLS de profiles apres
-- verification explicite du role).
create or replace function public.admin_list_users(
  p_search text default null,
  p_role   public.user_role default null,
  p_limit  integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid, role public.user_role, first_name text, last_name text,
  email text, phone text, region_code text, is_suspended boolean,
  created_at timestamptz, lands_count bigint, requests_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.role, p.first_name, p.last_name, p.email, p.phone,
         p.region_code, p.is_suspended, p.created_at,
         (select count(*) from public.land_listings l where l.owner_id = p.id)::bigint,
         (select count(*) from public.participant_requests r where r.participant_id = p.id)::bigint
  from public.profiles p
  where public.is_admin()
    and (p_role is null or p.role = p_role)
    and (
      p_search is null or p_search = ''
      or p.first_name ilike '%' || p_search || '%'
      or p.last_name  ilike '%' || p_search || '%'
      or p.email      ilike '%' || p_search || '%'
      or p.phone      ilike '%' || p_search || '%'
    )
  order by p.created_at desc
  limit greatest(p_limit, 1) offset greatest(p_offset, 0);
$$;

-- Vue administrateur du matching (section "Matching" du back-office)
create or replace function public.admin_recent_matches(p_limit integer default 50)
returns table (
  id uuid, score numeric, status public.match_status, created_at timestamptz,
  land_id uuid, land_title text, land_city text,
  request_id uuid, request_title text,
  participant_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.score, m.status, m.created_at,
         l.id, l.title, coalesce(c.name_fr, l.city_other),
         r.id, r.title,
         trim(p.first_name || ' ' || p.last_name)
  from public.matches m
  join public.land_listings l on l.id = m.land_id
  left join public.cities c on c.id = l.city_id
  join public.participant_requests r on r.id = m.request_id
  join public.profiles p on p.id = r.participant_id
  where public.is_admin()
  order by m.created_at desc
  limit greatest(p_limit, 1);
$$;

-- ###########################################################################
-- # 20260810094000_reference_data.sql
-- ###########################################################################

-- =============================================================================
-- Ntcharkou — Migration 5/5 : referentiel geographique du Maroc
-- 12 regions administratives et principales villes.
-- =============================================================================

insert into public.regions (code, name_fr, name_ar, sort_order) values
  ('tanger-tetouan-al-hoceima', 'Tanger-Tétouan-Al Hoceïma', 'طنجة تطوان الحسيمة',  1),
  ('oriental',                  'L''Oriental',                'الشرق',               2),
  ('fes-meknes',                'Fès-Meknès',                 'فاس مكناس',           3),
  ('rabat-sale-kenitra',        'Rabat-Salé-Kénitra',         'الرباط سلا القنيطرة', 4),
  ('beni-mellal-khenifra',      'Béni Mellal-Khénifra',       'بني ملال خنيفرة',     5),
  ('casablanca-settat',         'Casablanca-Settat',          'الدار البيضاء سطات',  6),
  ('marrakech-safi',            'Marrakech-Safi',             'مراكش آسفي',          7),
  ('draa-tafilalet',            'Drâa-Tafilalet',             'درعة تافيلالت',       8),
  ('souss-massa',               'Souss-Massa',                'سوس ماسة',            9),
  ('guelmim-oued-noun',         'Guelmim-Oued Noun',          'كلميم واد نون',      10),
  ('laayoune-sakia-el-hamra',   'Laâyoune-Sakia El Hamra',    'العيون الساقية الحمراء', 11),
  ('dakhla-oued-ed-dahab',      'Dakhla-Oued Ed-Dahab',       'الداخلة وادي الذهب',  12)
on conflict (code) do nothing;

insert into public.cities (region_code, name_fr, is_major) values
  -- Tanger-Tétouan-Al Hoceïma
  ('tanger-tetouan-al-hoceima', 'Tanger',        true),
  ('tanger-tetouan-al-hoceima', 'Tétouan',       true),
  ('tanger-tetouan-al-hoceima', 'Al Hoceïma',    true),
  ('tanger-tetouan-al-hoceima', 'Larache',       false),
  ('tanger-tetouan-al-hoceima', 'Chefchaouen',   false),
  ('tanger-tetouan-al-hoceima', 'Ksar El Kébir', false),
  ('tanger-tetouan-al-hoceima', 'Fnideq',        false),
  ('tanger-tetouan-al-hoceima', 'Martil',        false),
  ('tanger-tetouan-al-hoceima', 'Asilah',        false),
  ('tanger-tetouan-al-hoceima', 'Ouezzane',      false),

  -- L'Oriental
  ('oriental', 'Oujda',      true),
  ('oriental', 'Nador',      true),
  ('oriental', 'Berkane',    false),
  ('oriental', 'Taourirt',   false),
  ('oriental', 'Jerada',     false),
  ('oriental', 'Driouch',    false),
  ('oriental', 'Guercif',    false),
  ('oriental', 'Saïdia',     false),
  ('oriental', 'Figuig',     false),

  -- Fès-Meknès
  ('fes-meknes', 'Fès',            true),
  ('fes-meknes', 'Meknès',         true),
  ('fes-meknes', 'Taza',           false),
  ('fes-meknes', 'Sefrou',         false),
  ('fes-meknes', 'Ifrane',         false),
  ('fes-meknes', 'Moulay Yacoub',  false),
  ('fes-meknes', 'El Hajeb',       false),
  ('fes-meknes', 'Taounate',       false),
  ('fes-meknes', 'Boulemane',      false),

  -- Rabat-Salé-Kénitra
  ('rabat-sale-kenitra', 'Rabat',        true),
  ('rabat-sale-kenitra', 'Salé',         true),
  ('rabat-sale-kenitra', 'Kénitra',      true),
  ('rabat-sale-kenitra', 'Témara',       true),
  ('rabat-sale-kenitra', 'Skhirat',      false),
  ('rabat-sale-kenitra', 'Khémisset',    false),
  ('rabat-sale-kenitra', 'Sidi Kacem',   false),
  ('rabat-sale-kenitra', 'Sidi Slimane', false),
  ('rabat-sale-kenitra', 'Tiflet',       false),
  ('rabat-sale-kenitra', 'Bouknadel',    false),

  -- Béni Mellal-Khénifra
  ('beni-mellal-khenifra', 'Béni Mellal',  true),
  ('beni-mellal-khenifra', 'Khénifra',     false),
  ('beni-mellal-khenifra', 'Khouribga',    true),
  ('beni-mellal-khenifra', 'Fquih Ben Salah', false),
  ('beni-mellal-khenifra', 'Azilal',       false),
  ('beni-mellal-khenifra', 'Kasba Tadla',  false),
  ('beni-mellal-khenifra', 'Oued Zem',     false),

  -- Casablanca-Settat
  ('casablanca-settat', 'Casablanca',      true),
  ('casablanca-settat', 'Mohammédia',      true),
  ('casablanca-settat', 'Settat',          true),
  ('casablanca-settat', 'El Jadida',       true),
  ('casablanca-settat', 'Berrechid',       false),
  ('casablanca-settat', 'Benslimane',      false),
  ('casablanca-settat', 'Bouskoura',       false),
  ('casablanca-settat', 'Dar Bouazza',     false),
  ('casablanca-settat', 'Nouaceur',        false),
  ('casablanca-settat', 'Médiouna',        false),
  ('casablanca-settat', 'Azemmour',        false),
  ('casablanca-settat', 'Sidi Bennour',    false),

  -- Marrakech-Safi
  ('marrakech-safi', 'Marrakech',     true),
  ('marrakech-safi', 'Safi',          true),
  ('marrakech-safi', 'Essaouira',     true),
  ('marrakech-safi', 'El Kelâa des Sraghna', false),
  ('marrakech-safi', 'Youssoufia',    false),
  ('marrakech-safi', 'Chichaoua',     false),
  ('marrakech-safi', 'Ben Guerir',    false),
  ('marrakech-safi', 'Amizmiz',       false),

  -- Drâa-Tafilalet
  ('draa-tafilalet', 'Errachidia',  true),
  ('draa-tafilalet', 'Ouarzazate',  true),
  ('draa-tafilalet', 'Zagora',      false),
  ('draa-tafilalet', 'Tinghir',     false),
  ('draa-tafilalet', 'Midelt',      false),
  ('draa-tafilalet', 'Erfoud',      false),

  -- Souss-Massa
  ('souss-massa', 'Agadir',           true),
  ('souss-massa', 'Inezgane',         true),
  ('souss-massa', 'Aït Melloul',      false),
  ('souss-massa', 'Taroudant',        false),
  ('souss-massa', 'Tiznit',           false),
  ('souss-massa', 'Ouarzazate Massa', false),
  ('souss-massa', 'Tata',             false),
  ('souss-massa', 'Chtouka Aït Baha', false),

  -- Guelmim-Oued Noun
  ('guelmim-oued-noun', 'Guelmim',    true),
  ('guelmim-oued-noun', 'Tan-Tan',    false),
  ('guelmim-oued-noun', 'Sidi Ifni',  false),
  ('guelmim-oued-noun', 'Assa-Zag',   false),

  -- Laâyoune-Sakia El Hamra
  ('laayoune-sakia-el-hamra', 'Laâyoune',  true),
  ('laayoune-sakia-el-hamra', 'Boujdour',  false),
  ('laayoune-sakia-el-hamra', 'Tarfaya',   false),
  ('laayoune-sakia-el-hamra', 'Es-Semara', false),

  -- Dakhla-Oued Ed-Dahab
  ('dakhla-oued-ed-dahab', 'Dakhla',    true),
  ('dakhla-oued-ed-dahab', 'Aousserd',  false)
on conflict (region_code, name_fr) do nothing;

-- ###########################################################################
-- # 20260810095000_interactions.sql
-- ###########################################################################

-- =============================================================================
-- Ntcharkou — Interactions utilisateur necessitant d'ecrire hors de son
-- perimetre RLS (notifier un proprietaire, marquer un match).
-- =============================================================================

-- « Je suis interesse » depuis la fiche terrain.
-- Le proprietaire est prevenu sans jamais recevoir l'identite du participant :
-- il consulte ensuite le recapitulatif anonymise de son annonce.
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

  -- Les correspondances existantes du participant sur ce terrain passent a
  -- "interesse" : le KPI de conversion du back-office s'appuie dessus.
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
end;
$$;

grant execute on function public.express_interest(uuid, text) to authenticated;

-- Marque une correspondance comme vue (ouverture depuis une notification) :
-- alimente le KPI "nombre de clics apres notification".
create or replace function public.mark_match_viewed(p_match uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.matches m
     set viewed_at = coalesce(m.viewed_at, now()),
         status = case when m.status = 'nouveau' then 'vu'::public.match_status else m.status end
    from public.participant_requests r
   where m.id = p_match
     and m.request_id = r.id
     and r.participant_id = auth.uid();
end;
$$;

grant execute on function public.mark_match_viewed(uuid) to authenticated;

-- Marque toutes les notifications comme lues.
create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.notifications
     set read_at = now()
   where profile_id = auth.uid() and read_at is null;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.mark_all_notifications_read() to authenticated;

-- ###########################################################################
-- # 20260810096000_hardening.sql
-- ###########################################################################

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

-- ###########################################################################
-- # 20260810097000_grants.sql
-- ###########################################################################

-- =============================================================================
-- Ntcharkou — Privilèges explicites sur les tables
--
-- Supabase accorde ces droits automatiquement via ALTER DEFAULT PRIVILEGES,
-- mais on les pose explicitement : la sécurité réelle est portée par RLS, et
-- une politique sans GRANT (ou l'inverse) est une source de bugs silencieux.
-- =============================================================================

grant usage on schema public to anon, authenticated;

-- --- Référentiel : lecture pour tous ----------------------------------------
grant select on public.regions to anon, authenticated;
grant select on public.cities  to anon, authenticated;

-- --- Contenu public (le filtrage par statut est fait par RLS) ---------------
grant select on public.land_listings to anon, authenticated;
grant select on public.land_images   to anon, authenticated;
grant select on public.projects      to anon, authenticated;

-- --- Écriture réservée aux comptes connectés --------------------------------
grant select, insert, update          on public.profiles             to authenticated;
grant select, insert, update          on public.owner_profiles       to authenticated;
grant select, insert, update          on public.participant_profiles to authenticated;
grant select, insert, update, delete  on public.land_listings        to authenticated;
grant select, insert, update, delete  on public.land_images          to authenticated;
grant select, insert, update, delete  on public.land_documents       to authenticated;
grant select, insert, update, delete  on public.participant_requests to authenticated;
grant select, insert, update, delete  on public.projects             to authenticated;
grant select, insert, update, delete  on public.project_participants to authenticated;
grant select, insert, update, delete  on public.project_documents    to authenticated;
grant select, update                  on public.matches              to authenticated;
grant select, insert, delete          on public.favorites            to authenticated;
grant select, insert, update          on public.notifications        to authenticated;
grant select, insert                  on public.admin_actions        to authenticated;
grant select, insert, update          on public.reports              to authenticated;

-- Les documents de projet marqués publics restent lisibles sans compte.
grant select on public.project_documents to anon;

-- --- Séquences des références lisibles (TER-…, DEM-…, PRJ-…) ----------------
-- `assign_reference` s'exécute avec les droits de l'appelant : sans USAGE,
-- l'insertion d'un terrain échouerait.
grant usage on sequence public.land_reference_seq    to authenticated;
grant usage on sequence public.request_reference_seq to authenticated;
grant usage on sequence public.project_reference_seq to authenticated;

-- ###########################################################################
-- # 20260810098000_cities_complete.sql
-- ###########################################################################

-- =============================================================================
-- Ntcharkou — Référentiel géographique complet
--
-- Les 12 régions administratives du Maroc étaient déjà en place (migration
-- 20260810094000). Cette migration remplace la sélection de villes principales
-- par l'ensemble des communes urbaines / municipalités du Royaume, région par
-- région — 283 entrées, chaque région étant pourvue.
--
-- Portée retenue : les communes urbaines (municipalités). Les communes rurales,
-- douars et centres délégués n'y figurent pas ; le formulaire propriétaire
-- prévoit pour cela le champ libre « Autre ville / commune » (`city_other`).
-- Ajouter une localité manquante ne demande qu'une ligne dans ce fichier ou une
-- insertion depuis le back-office.
--
-- `is_major` distingue les chefs-lieux de région et de province : l'interface
-- s'en sert pour les mettre en avant dans les listes.
-- =============================================================================

-- --- Corrections du jeu initial ---------------------------------------------
-- Trois entrées à retirer : « Ouarzazate Massa » n'existe pas, tandis que
-- « Chtouka Aït Baha » et « Assa-Zag » sont des provinces et non des villes
-- (leurs chefs-lieux, Biougra et Assa, figurent bien dans la liste ci-dessous).
delete from public.cities
 where (region_code = 'souss-massa' and name_fr in ('Ouarzazate Massa', 'Chtouka Aït Baha'))
    or (region_code = 'guelmim-oued-noun' and name_fr = 'Assa-Zag');

-- --- Ajout des communes urbaines --------------------------------------------
insert into public.cities (region_code, name_fr, is_major) values

  -- ===== 1. Tanger-Tétouan-Al Hoceïma =======================================
  ('tanger-tetouan-al-hoceima', 'Tanger',              true),
  ('tanger-tetouan-al-hoceima', 'Tétouan',             true),
  ('tanger-tetouan-al-hoceima', 'Al Hoceïma',          true),
  ('tanger-tetouan-al-hoceima', 'Larache',             true),
  ('tanger-tetouan-al-hoceima', 'Chefchaouen',         true),
  ('tanger-tetouan-al-hoceima', 'Ouezzane',            true),
  ('tanger-tetouan-al-hoceima', 'Ksar El Kébir',       false),
  ('tanger-tetouan-al-hoceima', 'Asilah',              false),
  ('tanger-tetouan-al-hoceima', 'Ksar Es-Seghir',      false),
  ('tanger-tetouan-al-hoceima', 'Martil',              false),
  ('tanger-tetouan-al-hoceima', 'M''diq',              false),
  ('tanger-tetouan-al-hoceima', 'Fnideq',              false),
  ('tanger-tetouan-al-hoceima', 'Oued Laou',           false),
  ('tanger-tetouan-al-hoceima', 'Bab Taza',            false),
  ('tanger-tetouan-al-hoceima', 'Zoumi',               false),
  ('tanger-tetouan-al-hoceima', 'Imzouren',            false),
  ('tanger-tetouan-al-hoceima', 'Bni Bouayach',        false),
  ('tanger-tetouan-al-hoceima', 'Targuist',            false),
  ('tanger-tetouan-al-hoceima', 'Ajdir',               false),
  ('tanger-tetouan-al-hoceima', 'Jebha',               false),
  ('tanger-tetouan-al-hoceima', 'Bni Hadifa',          false),
  ('tanger-tetouan-al-hoceima', 'Dar Chaoui',          false),

  -- ===== 2. L'Oriental =======================================================
  ('oriental', 'Oujda',                    true),
  ('oriental', 'Nador',                    true),
  ('oriental', 'Berkane',                  true),
  ('oriental', 'Taourirt',                 true),
  ('oriental', 'Guercif',                  true),
  ('oriental', 'Jerada',                   true),
  ('oriental', 'Driouch',                  true),
  ('oriental', 'Figuig',                   true),
  ('oriental', 'Bouarfa',                  false),
  ('oriental', 'Saïdia',                   false),
  ('oriental', 'Ahfir',                    false),
  ('oriental', 'Zaïo',                     false),
  ('oriental', 'Selouane',                 false),
  ('oriental', 'Al Aaroui',                false),
  ('oriental', 'Beni Ansar',               false),
  ('oriental', 'Ras El Ma',                false),
  ('oriental', 'Ben Taïeb',                false),
  ('oriental', 'Midar',                    false),
  ('oriental', 'Aïn Beni Mathar',          false),
  ('oriental', 'El Aïoun Sidi Mellouk',    false),
  ('oriental', 'Debdou',                   false),
  ('oriental', 'Talsint',                  false),
  ('oriental', 'Tendrara',                 false),
  ('oriental', 'Bni Drar',                 false),
  ('oriental', 'Naïma',                    false),
  ('oriental', 'Touissit',                 false),
  ('oriental', 'Sidi Slimane Echcharaa',   false),
  ('oriental', 'Madagh',                   false),
  ('oriental', 'Aklim',                    false),

  -- ===== 3. Fès-Meknès =======================================================
  ('fes-meknes', 'Fès',                    true),
  ('fes-meknes', 'Meknès',                 true),
  ('fes-meknes', 'Taza',                   true),
  ('fes-meknes', 'Sefrou',                 true),
  ('fes-meknes', 'Ifrane',                 true),
  ('fes-meknes', 'El Hajeb',               true),
  ('fes-meknes', 'Moulay Yacoub',          true),
  ('fes-meknes', 'Taounate',               true),
  ('fes-meknes', 'Boulemane',              true),
  ('fes-meknes', 'Azrou',                  false),
  ('fes-meknes', 'Agourai',                false),
  ('fes-meknes', 'Aïn Taoujdate',          false),
  ('fes-meknes', 'Moulay Idriss Zerhoun',  false),
  ('fes-meknes', 'Boufakrane',             false),
  ('fes-meknes', 'Sebaa Ayoun',            false),
  ('fes-meknes', 'Bhalil',                 false),
  ('fes-meknes', 'El Menzel',              false),
  ('fes-meknes', 'Ribate El Kheir',        false),
  ('fes-meknes', 'Imouzzer Kandar',        false),
  ('fes-meknes', 'Imouzzer Marmoucha',     false),
  ('fes-meknes', 'Missour',                false),
  ('fes-meknes', 'Outat El Haj',           false),
  ('fes-meknes', 'Tissa',                  false),
  ('fes-meknes', 'Karia Ba Mohamed',       false),
  ('fes-meknes', 'Ghafsaï',                false),
  ('fes-meknes', 'Rhafsaï',                false),
  ('fes-meknes', 'Aïn Aïcha',              false),
  ('fes-meknes', 'Thar Es-Souk',           false),
  ('fes-meknes', 'Tahla',                  false),
  ('fes-meknes', 'Oued Amlil',             false),
  ('fes-meknes', 'Aknoul',                 false),
  ('fes-meknes', 'Tizi Ouasli',            false),
  ('fes-meknes', 'Matmata',                false),
  ('fes-meknes', 'Ouled Tayeb',            false),

  -- ===== 4. Rabat-Salé-Kénitra ==============================================
  ('rabat-sale-kenitra', 'Rabat',                  true),
  ('rabat-sale-kenitra', 'Salé',                   true),
  ('rabat-sale-kenitra', 'Kénitra',                true),
  ('rabat-sale-kenitra', 'Témara',                 true),
  ('rabat-sale-kenitra', 'Khémisset',              true),
  ('rabat-sale-kenitra', 'Sidi Kacem',             true),
  ('rabat-sale-kenitra', 'Sidi Slimane',           true),
  ('rabat-sale-kenitra', 'Skhirat',                false),
  ('rabat-sale-kenitra', 'Harhoura',               false),
  ('rabat-sale-kenitra', 'Aïn El Aouda',           false),
  ('rabat-sale-kenitra', 'Aïn Attig',              false),
  ('rabat-sale-kenitra', 'Sidi Yahya Zaer',        false),
  ('rabat-sale-kenitra', 'Bouknadel',              false),
  ('rabat-sale-kenitra', 'Mehdia',                 false),
  ('rabat-sale-kenitra', 'Sidi Taïbi',             false),
  ('rabat-sale-kenitra', 'Sidi Allal Tazi',        false),
  ('rabat-sale-kenitra', 'Moulay Bousselham',      false),
  ('rabat-sale-kenitra', 'Lalla Mimouna',          false),
  ('rabat-sale-kenitra', 'Arbaoua',                false),
  ('rabat-sale-kenitra', 'Souk El Arbaa',          false),
  ('rabat-sale-kenitra', 'Sidi Yahya El Gharb',    false),
  ('rabat-sale-kenitra', 'Mechra Bel Ksiri',       false),
  ('rabat-sale-kenitra', 'Jorf El Melha',          false),
  ('rabat-sale-kenitra', 'Had Kourt',              false),
  ('rabat-sale-kenitra', 'Tiflet',                 false),
  ('rabat-sale-kenitra', 'Rommani',                false),
  ('rabat-sale-kenitra', 'Maâziz',                 false),
  ('rabat-sale-kenitra', 'Tiddas',                 false),
  ('rabat-sale-kenitra', 'Oulmès',                 false),
  ('rabat-sale-kenitra', 'Sidi Allal El Bahraoui', false),
  ('rabat-sale-kenitra', 'Ezzhiliga',              false),
  ('rabat-sale-kenitra', 'Khemis Sidi Yahya',      false),

  -- ===== 5. Béni Mellal-Khénifra ============================================
  ('beni-mellal-khenifra', 'Béni Mellal',            true),
  ('beni-mellal-khenifra', 'Khouribga',              true),
  ('beni-mellal-khenifra', 'Khénifra',               true),
  ('beni-mellal-khenifra', 'Azilal',                 true),
  ('beni-mellal-khenifra', 'Fquih Ben Salah',        true),
  ('beni-mellal-khenifra', 'Kasba Tadla',            false),
  ('beni-mellal-khenifra', 'El Ksiba',               false),
  ('beni-mellal-khenifra', 'Zaouiat Cheikh',         false),
  ('beni-mellal-khenifra', 'Souk Sebt Ouled Nemma',  false),
  ('beni-mellal-khenifra', 'Oulad Ayad',             false),
  ('beni-mellal-khenifra', 'Oulad M''Barek',         false),
  ('beni-mellal-khenifra', 'Demnate',                false),
  ('beni-mellal-khenifra', 'Afourer',                false),
  ('beni-mellal-khenifra', 'Bzou',                   false),
  ('beni-mellal-khenifra', 'Ouaouizeght',            false),
  ('beni-mellal-khenifra', 'M''rirt',                false),
  ('beni-mellal-khenifra', 'Aguelmous',              false),
  ('beni-mellal-khenifra', 'El Kbab',                false),
  ('beni-mellal-khenifra', 'Moulay Bouazza',         false),
  ('beni-mellal-khenifra', 'Aït Ishaq',              false),
  ('beni-mellal-khenifra', 'Tighassaline',           false),
  ('beni-mellal-khenifra', 'Oued Zem',               false),
  ('beni-mellal-khenifra', 'Boujaad',                false),
  ('beni-mellal-khenifra', 'Hattane',                false),

  -- ===== 6. Casablanca-Settat ===============================================
  ('casablanca-settat', 'Casablanca',        true),
  ('casablanca-settat', 'Mohammédia',        true),
  ('casablanca-settat', 'El Jadida',         true),
  ('casablanca-settat', 'Settat',            true),
  ('casablanca-settat', 'Berrechid',         true),
  ('casablanca-settat', 'Benslimane',        true),
  ('casablanca-settat', 'Sidi Bennour',      true),
  ('casablanca-settat', 'Nouaceur',          true),
  ('casablanca-settat', 'Médiouna',          true),
  ('casablanca-settat', 'Aïn Harrouda',      false),
  ('casablanca-settat', 'Bouskoura',         false),
  ('casablanca-settat', 'Dar Bouazza',       false),
  ('casablanca-settat', 'Tit Mellil',        false),
  ('casablanca-settat', 'Lahraouyine',       false),
  ('casablanca-settat', 'Bouznika',          false),
  ('casablanca-settat', 'Deroua',            false),
  ('casablanca-settat', 'Had Soualem',       false),
  ('casablanca-settat', 'Sidi Rahal Chatai', false),
  ('casablanca-settat', 'Azemmour',          false),
  ('casablanca-settat', 'Bir Jdid',          false),
  ('casablanca-settat', 'Moulay Abdallah',   false),
  ('casablanca-settat', 'Oualidia',          false),
  ('casablanca-settat', 'Zemamra',           false),
  ('casablanca-settat', 'Sidi Smaïl',        false),
  ('casablanca-settat', 'Ben Ahmed',         false),
  ('casablanca-settat', 'Guisser',           false),
  ('casablanca-settat', 'El Borouj',         false),
  ('casablanca-settat', 'El Gara',           false),
  ('casablanca-settat', 'Oulad Abbou',       false),
  ('casablanca-settat', 'Oulad Saïd',        false),
  ('casablanca-settat', 'Loulad',            false),
  ('casablanca-settat', 'Ras El Aïn',        false),
  ('casablanca-settat', 'Sidi Hajjaj',       false),

  -- ===== 7. Marrakech-Safi ==================================================
  ('marrakech-safi', 'Marrakech',              true),
  ('marrakech-safi', 'Safi',                   true),
  ('marrakech-safi', 'Essaouira',              true),
  ('marrakech-safi', 'El Kelâa des Sraghna',   true),
  ('marrakech-safi', 'Youssoufia',             true),
  ('marrakech-safi', 'Chichaoua',              true),
  ('marrakech-safi', 'Ben Guerir',             true),
  ('marrakech-safi', 'Tahannaout',             true),
  ('marrakech-safi', 'Aït Ourir',              false),
  ('marrakech-safi', 'Amizmiz',                false),
  ('marrakech-safi', 'Moulay Brahim',          false),
  ('marrakech-safi', 'Asni',                   false),
  ('marrakech-safi', 'Imintanoute',            false),
  ('marrakech-safi', 'Tamallalt',              false),
  ('marrakech-safi', 'El Attaouia',            false),
  ('marrakech-safi', 'Sidi Rahal',             false),
  ('marrakech-safi', 'Sidi Bou Othmane',       false),
  ('marrakech-safi', 'Skhour Rehamna',         false),
  ('marrakech-safi', 'Sebt Gzoula',            false),
  ('marrakech-safi', 'Jemaa Shaim',            false),
  ('marrakech-safi', 'Chemaïa',                false),
  ('marrakech-safi', 'Tamanar',                false),
  ('marrakech-safi', 'Smimou',                 false),
  ('marrakech-safi', 'Talmest',                false),
  ('marrakech-safi', 'Ighoud',                 false),
  ('marrakech-safi', 'Loudaya',                false),

  -- ===== 8. Drâa-Tafilalet ==================================================
  ('draa-tafilalet', 'Errachidia',        true),
  ('draa-tafilalet', 'Ouarzazate',        true),
  ('draa-tafilalet', 'Zagora',            true),
  ('draa-tafilalet', 'Tinghir',           true),
  ('draa-tafilalet', 'Midelt',            true),
  ('draa-tafilalet', 'Erfoud',            false),
  ('draa-tafilalet', 'Rissani',           false),
  ('draa-tafilalet', 'Goulmima',          false),
  ('draa-tafilalet', 'Tinejdad',          false),
  ('draa-tafilalet', 'Jorf',              false),
  ('draa-tafilalet', 'Boudnib',           false),
  ('draa-tafilalet', 'Er-Rich',           false),
  ('draa-tafilalet', 'Zaïda',             false),
  ('draa-tafilalet', 'Itzer',             false),
  ('draa-tafilalet', 'Boumia',            false),
  ('draa-tafilalet', 'Taznakht',          false),
  ('draa-tafilalet', 'Skoura',            false),
  ('draa-tafilalet', 'Agdz',              false),
  ('draa-tafilalet', 'Kelaat M''Gouna',   false),
  ('draa-tafilalet', 'Boumalne Dadès',    false),
  ('draa-tafilalet', 'Tagounite',         false),
  ('draa-tafilalet', 'Mhamid El Ghizlane',false),
  ('draa-tafilalet', 'Alnif',             false),
  ('draa-tafilalet', 'Tazarine',          false),
  ('draa-tafilalet', 'Aoufous',           false),
  ('draa-tafilalet', 'Amerzgane',         false),

  -- ===== 9. Souss-Massa =====================================================
  ('souss-massa', 'Agadir',                true),
  ('souss-massa', 'Inezgane',              true),
  ('souss-massa', 'Taroudant',             true),
  ('souss-massa', 'Tiznit',                true),
  ('souss-massa', 'Tata',                  true),
  ('souss-massa', 'Biougra',               true),
  ('souss-massa', 'Aït Melloul',           false),
  ('souss-massa', 'Dcheira El Jihadia',    false),
  ('souss-massa', 'Lqliaa',                false),
  ('souss-massa', 'Temsia',                false),
  ('souss-massa', 'Drarga',                false),
  ('souss-massa', 'Aourir',                false),
  ('souss-massa', 'Aït Baha',              false),
  ('souss-massa', 'Belfaa',                false),
  ('souss-massa', 'Sidi Bibi',             false),
  ('souss-massa', 'Massa',                 false),
  ('souss-massa', 'Oulad Teima',           false),
  ('souss-massa', 'Aït Iaaza',             false),
  ('souss-massa', 'Ouled Berhil',          false),
  ('souss-massa', 'Taliouine',             false),
  ('souss-massa', 'Aoulouz',               false),
  ('souss-massa', 'Igherm',                false),
  ('souss-massa', 'Tafraout',              false),
  ('souss-massa', 'Foum Zguid',            false),
  ('souss-massa', 'Akka',                  false),
  ('souss-massa', 'Fam El Hisn',           false),
  ('souss-massa', 'Tissint',               false),
  ('souss-massa', 'Arazane',               false),

  -- ===== 10. Guelmim-Oued Noun ==============================================
  ('guelmim-oued-noun', 'Guelmim',      true),
  ('guelmim-oued-noun', 'Tan-Tan',      true),
  ('guelmim-oued-noun', 'Sidi Ifni',    true),
  ('guelmim-oued-noun', 'Assa',         true),
  ('guelmim-oued-noun', 'Zag',          false),
  ('guelmim-oued-noun', 'Bouizakarne',  false),
  ('guelmim-oued-noun', 'El Ouatia',    false),
  ('guelmim-oued-noun', 'Mirleft',      false),
  ('guelmim-oued-noun', 'Lakhsas',      false),
  ('guelmim-oued-noun', 'Taghjijt',     false),
  ('guelmim-oued-noun', 'Abaynou',      false),

  -- ===== 11. Laâyoune-Sakia El Hamra ========================================
  ('laayoune-sakia-el-hamra', 'Laâyoune',    true),
  ('laayoune-sakia-el-hamra', 'Es-Semara',   true),
  ('laayoune-sakia-el-hamra', 'Boujdour',    true),
  ('laayoune-sakia-el-hamra', 'Tarfaya',     true),
  ('laayoune-sakia-el-hamra', 'El Marsa',    false),
  ('laayoune-sakia-el-hamra', 'Foum El Oued',false),
  ('laayoune-sakia-el-hamra', 'Akhfennir',   false),
  ('laayoune-sakia-el-hamra', 'Daoura',      false),
  ('laayoune-sakia-el-hamra', 'Jdiriya',     false),

  -- ===== 12. Dakhla-Oued Ed-Dahab ===========================================
  ('dakhla-oued-ed-dahab', 'Dakhla',           true),
  ('dakhla-oued-ed-dahab', 'Aousserd',         true),
  ('dakhla-oued-ed-dahab', 'El Argoub',        false),
  ('dakhla-oued-ed-dahab', 'Bir Anzarane',     false),
  ('dakhla-oued-ed-dahab', 'Bir Gandouz',      false),
  ('dakhla-oued-ed-dahab', 'Tichla',           false),
  ('dakhla-oued-ed-dahab', 'Gleibat El Foula', false),
  ('dakhla-oued-ed-dahab', 'Imlili',           false)

on conflict (region_code, name_fr) do update
  set is_major = excluded.is_major;

-- --- Contrôle : les 12 régions doivent toutes être pourvues -----------------
do $$
declare
  orphan text;
  total  integer;
begin
  select string_agg(r.code, ', ') into orphan
  from public.regions r
  where not exists (select 1 from public.cities c where c.region_code = r.code);

  if orphan is not null then
    raise exception 'Régions sans aucune ville : %', orphan;
  end if;

  select count(*) into total from public.cities;
  raise notice 'Référentiel : % régions, % villes',
    (select count(*) from public.regions), total;
end;
$$;

-- ###########################################################################
-- # 20260810099000_arabic_names.sql
-- ###########################################################################

-- =============================================================================
-- Ntcharkou — Toponymie arabe
--
-- Les 12 régions portaient déjà leur nom arabe (migration 20260810094000).
-- Cette migration ajoute celui des 282 communes, et expose les deux graphies
-- dans les vues publiques pour que l'application choisisse selon la langue.
--
-- La toponymie marocaine connaît plusieurs graphies acceptables (notamment
-- pour les noms d'origine amazighe) : cette liste suit l'usage administratif
-- courant et gagne à être relue par un locuteur natif avant mise en production.
-- La colonne reste facultative — l'application retombe sur le nom français
-- lorsqu'elle est vide.
-- =============================================================================

update public.cities c
   set name_ar = v.name_ar
  from (values
  -- ===== Tanger-Tétouan-Al Hoceïma ==========================================
  ('tanger-tetouan-al-hoceima', 'Tanger',              'طنجة'),
  ('tanger-tetouan-al-hoceima', 'Tétouan',             'تطوان'),
  ('tanger-tetouan-al-hoceima', 'Al Hoceïma',          'الحسيمة'),
  ('tanger-tetouan-al-hoceima', 'Larache',             'العرائش'),
  ('tanger-tetouan-al-hoceima', 'Chefchaouen',         'شفشاون'),
  ('tanger-tetouan-al-hoceima', 'Ouezzane',            'وزان'),
  ('tanger-tetouan-al-hoceima', 'Ksar El Kébir',       'القصر الكبير'),
  ('tanger-tetouan-al-hoceima', 'Asilah',              'أصيلة'),
  ('tanger-tetouan-al-hoceima', 'Ksar Es-Seghir',      'القصر الصغير'),
  ('tanger-tetouan-al-hoceima', 'Martil',              'مرتيل'),
  ('tanger-tetouan-al-hoceima', 'M''diq',              'المضيق'),
  ('tanger-tetouan-al-hoceima', 'Fnideq',              'الفنيدق'),
  ('tanger-tetouan-al-hoceima', 'Oued Laou',           'واد لاو'),
  ('tanger-tetouan-al-hoceima', 'Bab Taza',            'باب تازة'),
  ('tanger-tetouan-al-hoceima', 'Zoumi',               'زومي'),
  ('tanger-tetouan-al-hoceima', 'Imzouren',            'إمزورن'),
  ('tanger-tetouan-al-hoceima', 'Bni Bouayach',        'بني بوعياش'),
  ('tanger-tetouan-al-hoceima', 'Targuist',            'ترجيست'),
  ('tanger-tetouan-al-hoceima', 'Ajdir',               'أجدير'),
  ('tanger-tetouan-al-hoceima', 'Jebha',               'الجبهة'),
  ('tanger-tetouan-al-hoceima', 'Bni Hadifa',          'بني حديفة'),
  ('tanger-tetouan-al-hoceima', 'Dar Chaoui',          'دار الشاوي'),

  -- ===== L'Oriental =========================================================
  ('oriental', 'Oujda',                    'وجدة'),
  ('oriental', 'Nador',                    'الناظور'),
  ('oriental', 'Berkane',                  'بركان'),
  ('oriental', 'Taourirt',                 'تاوريرت'),
  ('oriental', 'Guercif',                  'جرسيف'),
  ('oriental', 'Jerada',                   'جرادة'),
  ('oriental', 'Driouch',                  'الدريوش'),
  ('oriental', 'Figuig',                   'فجيج'),
  ('oriental', 'Bouarfa',                  'بوعرفة'),
  ('oriental', 'Saïdia',                   'السعيدية'),
  ('oriental', 'Ahfir',                    'أحفير'),
  ('oriental', 'Zaïo',                     'زايو'),
  ('oriental', 'Selouane',                 'سلوان'),
  ('oriental', 'Al Aaroui',                'العروي'),
  ('oriental', 'Beni Ansar',               'بني أنصار'),
  ('oriental', 'Ras El Ma',                'رأس الماء'),
  ('oriental', 'Ben Taïeb',                'بن الطيب'),
  ('oriental', 'Midar',                    'ميضار'),
  ('oriental', 'Aïn Beni Mathar',          'عين بني مطهر'),
  ('oriental', 'El Aïoun Sidi Mellouk',    'العيون سيدي ملوك'),
  ('oriental', 'Debdou',                   'دبدو'),
  ('oriental', 'Talsint',                  'تالسينت'),
  ('oriental', 'Tendrara',                 'تندرارة'),
  ('oriental', 'Bni Drar',                 'بني درار'),
  ('oriental', 'Naïma',                    'نعيمة'),
  ('oriental', 'Touissit',                 'تويسيت'),
  ('oriental', 'Sidi Slimane Echcharaa',   'سيدي سليمان الشراعة'),
  ('oriental', 'Madagh',                   'مداغ'),
  ('oriental', 'Aklim',                    'أقليم'),

  -- ===== Fès-Meknès =========================================================
  ('fes-meknes', 'Fès',                    'فاس'),
  ('fes-meknes', 'Meknès',                 'مكناس'),
  ('fes-meknes', 'Taza',                   'تازة'),
  ('fes-meknes', 'Sefrou',                 'صفرو'),
  ('fes-meknes', 'Ifrane',                 'إفران'),
  ('fes-meknes', 'El Hajeb',               'الحاجب'),
  ('fes-meknes', 'Moulay Yacoub',          'مولاي يعقوب'),
  ('fes-meknes', 'Taounate',               'تاونات'),
  ('fes-meknes', 'Boulemane',              'بولمان'),
  ('fes-meknes', 'Azrou',                  'أزرو'),
  ('fes-meknes', 'Agourai',                'أݣوراي'),
  ('fes-meknes', 'Aïn Taoujdate',          'عين تاوجطات'),
  ('fes-meknes', 'Moulay Idriss Zerhoun',  'مولاي إدريس زرهون'),
  ('fes-meknes', 'Boufakrane',             'بوفكران'),
  ('fes-meknes', 'Sebaa Ayoun',            'سبع عيون'),
  ('fes-meknes', 'Bhalil',                 'بهاليل'),
  ('fes-meknes', 'El Menzel',              'المنزل'),
  ('fes-meknes', 'Ribate El Kheir',        'رباط الخير'),
  ('fes-meknes', 'Imouzzer Kandar',        'إيموزار كندر'),
  ('fes-meknes', 'Imouzzer Marmoucha',     'إيموزار مرموشة'),
  ('fes-meknes', 'Missour',                'ميسور'),
  ('fes-meknes', 'Outat El Haj',           'أوطاط الحاج'),
  ('fes-meknes', 'Tissa',                  'تيسة'),
  ('fes-meknes', 'Karia Ba Mohamed',       'قرية با محمد'),
  ('fes-meknes', 'Ghafsaï',                'غفساي'),
  ('fes-meknes', 'Rhafsaï',                'رغيوة'),
  ('fes-meknes', 'Aïn Aïcha',              'عين عائشة'),
  ('fes-meknes', 'Thar Es-Souk',           'ثهار السوق'),
  ('fes-meknes', 'Tahla',                  'تاهلة'),
  ('fes-meknes', 'Oued Amlil',             'واد أمليل'),
  ('fes-meknes', 'Aknoul',                 'أكنول'),
  ('fes-meknes', 'Tizi Ouasli',            'تيزي وسلي'),
  ('fes-meknes', 'Matmata',                'مطماطة'),
  ('fes-meknes', 'Ouled Tayeb',            'أولاد الطيب'),

  -- ===== Rabat-Salé-Kénitra =================================================
  ('rabat-sale-kenitra', 'Rabat',                  'الرباط'),
  ('rabat-sale-kenitra', 'Salé',                   'سلا'),
  ('rabat-sale-kenitra', 'Kénitra',                'القنيطرة'),
  ('rabat-sale-kenitra', 'Témara',                 'تمارة'),
  ('rabat-sale-kenitra', 'Khémisset',              'الخميسات'),
  ('rabat-sale-kenitra', 'Sidi Kacem',             'سيدي قاسم'),
  ('rabat-sale-kenitra', 'Sidi Slimane',           'سيدي سليمان'),
  ('rabat-sale-kenitra', 'Skhirat',                'الصخيرات'),
  ('rabat-sale-kenitra', 'Harhoura',               'الهرهورة'),
  ('rabat-sale-kenitra', 'Aïn El Aouda',           'عين العودة'),
  ('rabat-sale-kenitra', 'Aïn Attig',              'عين عتيق'),
  ('rabat-sale-kenitra', 'Sidi Yahya Zaer',        'سيدي يحيى زعير'),
  ('rabat-sale-kenitra', 'Bouknadel',              'بوقنادل'),
  ('rabat-sale-kenitra', 'Mehdia',                 'المهدية'),
  ('rabat-sale-kenitra', 'Sidi Taïbi',             'سيدي الطيبي'),
  ('rabat-sale-kenitra', 'Sidi Allal Tazi',        'سيدي علال التازي'),
  ('rabat-sale-kenitra', 'Moulay Bousselham',      'مولاي بوسلهام'),
  ('rabat-sale-kenitra', 'Lalla Mimouna',          'لالة ميمونة'),
  ('rabat-sale-kenitra', 'Arbaoua',                'عرباوة'),
  ('rabat-sale-kenitra', 'Souk El Arbaa',          'سوق الأربعاء'),
  ('rabat-sale-kenitra', 'Sidi Yahya El Gharb',    'سيدي يحيى الغرب'),
  ('rabat-sale-kenitra', 'Mechra Bel Ksiri',       'مشرع بلقصيري'),
  ('rabat-sale-kenitra', 'Jorf El Melha',          'جرف الملحة'),
  ('rabat-sale-kenitra', 'Had Kourt',              'حد كورت'),
  ('rabat-sale-kenitra', 'Tiflet',                 'تيفلت'),
  ('rabat-sale-kenitra', 'Rommani',                'الرماني'),
  ('rabat-sale-kenitra', 'Maâziz',                 'معزيز'),
  ('rabat-sale-kenitra', 'Tiddas',                 'تيداس'),
  ('rabat-sale-kenitra', 'Oulmès',                 'أولماس'),
  ('rabat-sale-kenitra', 'Sidi Allal El Bahraoui', 'سيدي علال البحراوي'),
  ('rabat-sale-kenitra', 'Ezzhiliga',              'الزحيليكة'),
  ('rabat-sale-kenitra', 'Khemis Sidi Yahya',      'خميس سيدي يحيى'),

  -- ===== Béni Mellal-Khénifra ===============================================
  ('beni-mellal-khenifra', 'Béni Mellal',            'بني ملال'),
  ('beni-mellal-khenifra', 'Khouribga',              'خريبكة'),
  ('beni-mellal-khenifra', 'Khénifra',               'خنيفرة'),
  ('beni-mellal-khenifra', 'Azilal',                 'أزيلال'),
  ('beni-mellal-khenifra', 'Fquih Ben Salah',        'الفقيه بن صالح'),
  ('beni-mellal-khenifra', 'Kasba Tadla',            'قصبة تادلة'),
  ('beni-mellal-khenifra', 'El Ksiba',               'القصيبة'),
  ('beni-mellal-khenifra', 'Zaouiat Cheikh',         'زاوية الشيخ'),
  ('beni-mellal-khenifra', 'Souk Sebt Ouled Nemma',  'سوق السبت أولاد النمة'),
  ('beni-mellal-khenifra', 'Oulad Ayad',             'أولاد عياد'),
  ('beni-mellal-khenifra', 'Oulad M''Barek',         'أولاد مبارك'),
  ('beni-mellal-khenifra', 'Demnate',                'دمنات'),
  ('beni-mellal-khenifra', 'Afourer',                'أفورار'),
  ('beni-mellal-khenifra', 'Bzou',                   'بزو'),
  ('beni-mellal-khenifra', 'Ouaouizeght',            'واويزغت'),
  ('beni-mellal-khenifra', 'M''rirt',                'مريرت'),
  ('beni-mellal-khenifra', 'Aguelmous',              'أݣلموس'),
  ('beni-mellal-khenifra', 'El Kbab',                'الكباب'),
  ('beni-mellal-khenifra', 'Moulay Bouazza',         'مولاي بوعزة'),
  ('beni-mellal-khenifra', 'Aït Ishaq',              'آيت إسحاق'),
  ('beni-mellal-khenifra', 'Tighassaline',           'تيغسالين'),
  ('beni-mellal-khenifra', 'Oued Zem',               'وادي زم'),
  ('beni-mellal-khenifra', 'Boujaad',                'أبي الجعد'),
  ('beni-mellal-khenifra', 'Hattane',                'حطان'),

  -- ===== Casablanca-Settat ==================================================
  ('casablanca-settat', 'Casablanca',        'الدار البيضاء'),
  ('casablanca-settat', 'Mohammédia',        'المحمدية'),
  ('casablanca-settat', 'El Jadida',         'الجديدة'),
  ('casablanca-settat', 'Settat',            'سطات'),
  ('casablanca-settat', 'Berrechid',         'برشيد'),
  ('casablanca-settat', 'Benslimane',        'بنسليمان'),
  ('casablanca-settat', 'Sidi Bennour',      'سيدي بنور'),
  ('casablanca-settat', 'Nouaceur',          'النواصر'),
  ('casablanca-settat', 'Médiouna',          'مديونة'),
  ('casablanca-settat', 'Aïn Harrouda',      'عين حرودة'),
  ('casablanca-settat', 'Bouskoura',         'بوسكورة'),
  ('casablanca-settat', 'Dar Bouazza',       'دار بوعزة'),
  ('casablanca-settat', 'Tit Mellil',        'تيط مليل'),
  ('casablanca-settat', 'Lahraouyine',       'لهراويين'),
  ('casablanca-settat', 'Bouznika',          'بوزنيقة'),
  ('casablanca-settat', 'Deroua',            'الدروة'),
  ('casablanca-settat', 'Had Soualem',       'حد السوالم'),
  ('casablanca-settat', 'Sidi Rahal Chatai', 'سيدي رحال الشاطئ'),
  ('casablanca-settat', 'Azemmour',          'أزمور'),
  ('casablanca-settat', 'Bir Jdid',          'بئر الجديد'),
  ('casablanca-settat', 'Moulay Abdallah',   'مولاي عبد الله'),
  ('casablanca-settat', 'Oualidia',          'الوالدية'),
  ('casablanca-settat', 'Zemamra',           'الزمامرة'),
  ('casablanca-settat', 'Sidi Smaïl',        'سيدي إسماعيل'),
  ('casablanca-settat', 'Ben Ahmed',         'بن أحمد'),
  ('casablanca-settat', 'Guisser',           'ݣيسر'),
  ('casablanca-settat', 'El Borouj',         'البروج'),
  ('casablanca-settat', 'El Gara',           'الݣارة'),
  ('casablanca-settat', 'Oulad Abbou',       'أولاد عبو'),
  ('casablanca-settat', 'Oulad Saïd',        'أولاد سعيد'),
  ('casablanca-settat', 'Loulad',            'اللولاد'),
  ('casablanca-settat', 'Ras El Aïn',        'رأس العين'),
  ('casablanca-settat', 'Sidi Hajjaj',       'سيدي حجاج'),

  -- ===== Marrakech-Safi =====================================================
  ('marrakech-safi', 'Marrakech',              'مراكش'),
  ('marrakech-safi', 'Safi',                   'آسفي'),
  ('marrakech-safi', 'Essaouira',              'الصويرة'),
  ('marrakech-safi', 'El Kelâa des Sraghna',   'قلعة السراغنة'),
  ('marrakech-safi', 'Youssoufia',             'اليوسفية'),
  ('marrakech-safi', 'Chichaoua',              'شيشاوة'),
  ('marrakech-safi', 'Ben Guerir',             'بنجرير'),
  ('marrakech-safi', 'Tahannaout',             'تحناوت'),
  ('marrakech-safi', 'Aït Ourir',              'آيت أورير'),
  ('marrakech-safi', 'Amizmiz',                'أمزميز'),
  ('marrakech-safi', 'Moulay Brahim',          'مولاي إبراهيم'),
  ('marrakech-safi', 'Asni',                   'أسني'),
  ('marrakech-safi', 'Imintanoute',            'إمينتانوت'),
  ('marrakech-safi', 'Tamallalt',              'تاملالت'),
  ('marrakech-safi', 'El Attaouia',            'العطاوية'),
  ('marrakech-safi', 'Sidi Rahal',             'سيدي رحال'),
  ('marrakech-safi', 'Sidi Bou Othmane',       'سيدي بوعثمان'),
  ('marrakech-safi', 'Skhour Rehamna',         'صخور الرحامنة'),
  ('marrakech-safi', 'Sebt Gzoula',            'سبت اݣزولة'),
  ('marrakech-safi', 'Jemaa Shaim',            'جمعة سحيم'),
  ('marrakech-safi', 'Chemaïa',                'الشماعية'),
  ('marrakech-safi', 'Tamanar',                'تمنار'),
  ('marrakech-safi', 'Smimou',                 'سميمو'),
  ('marrakech-safi', 'Talmest',                'تالمست'),
  ('marrakech-safi', 'Ighoud',                 'إيغود'),
  ('marrakech-safi', 'Loudaya',                'الودايا'),

  -- ===== Drâa-Tafilalet =====================================================
  ('draa-tafilalet', 'Errachidia',        'الرشيدية'),
  ('draa-tafilalet', 'Ouarzazate',        'ورزازات'),
  ('draa-tafilalet', 'Zagora',            'زاݣورة'),
  ('draa-tafilalet', 'Tinghir',           'تنغير'),
  ('draa-tafilalet', 'Midelt',            'ميدلت'),
  ('draa-tafilalet', 'Erfoud',            'أرفود'),
  ('draa-tafilalet', 'Rissani',           'الريصاني'),
  ('draa-tafilalet', 'Goulmima',          'كلميمة'),
  ('draa-tafilalet', 'Tinejdad',          'تنجداد'),
  ('draa-tafilalet', 'Jorf',              'الجرف'),
  ('draa-tafilalet', 'Boudnib',           'بوذنيب'),
  ('draa-tafilalet', 'Er-Rich',           'الريش'),
  ('draa-tafilalet', 'Zaïda',             'زايدة'),
  ('draa-tafilalet', 'Itzer',             'إيتزر'),
  ('draa-tafilalet', 'Boumia',            'بومية'),
  ('draa-tafilalet', 'Taznakht',          'تازناخت'),
  ('draa-tafilalet', 'Skoura',            'سكورة'),
  ('draa-tafilalet', 'Agdz',              'أݣدز'),
  ('draa-tafilalet', 'Kelaat M''Gouna',   'قلعة مݣونة'),
  ('draa-tafilalet', 'Boumalne Dadès',    'بومالن دادس'),
  ('draa-tafilalet', 'Tagounite',         'تاݣونيت'),
  ('draa-tafilalet', 'Mhamid El Ghizlane','امحاميد الغزلان'),
  ('draa-tafilalet', 'Alnif',             'ألنيف'),
  ('draa-tafilalet', 'Tazarine',          'تازارين'),
  ('draa-tafilalet', 'Aoufous',           'أوفوس'),
  ('draa-tafilalet', 'Amerzgane',         'أمرزݣان'),

  -- ===== Souss-Massa ========================================================
  ('souss-massa', 'Agadir',                'أݣادير'),
  ('souss-massa', 'Inezgane',              'إنزݣان'),
  ('souss-massa', 'Taroudant',             'تارودانت'),
  ('souss-massa', 'Tiznit',                'تيزنيت'),
  ('souss-massa', 'Tata',                  'طاطا'),
  ('souss-massa', 'Biougra',               'بيوݣرى'),
  ('souss-massa', 'Aït Melloul',           'آيت ملول'),
  ('souss-massa', 'Dcheira El Jihadia',    'الدشيرة الجهادية'),
  ('souss-massa', 'Lqliaa',                'القليعة'),
  ('souss-massa', 'Temsia',                'تمسية'),
  ('souss-massa', 'Drarga',                'الدراركة'),
  ('souss-massa', 'Aourir',                'أورير'),
  ('souss-massa', 'Aït Baha',              'آيت باها'),
  ('souss-massa', 'Belfaa',                'بلفاع'),
  ('souss-massa', 'Sidi Bibi',             'سيدي بيبي'),
  ('souss-massa', 'Massa',                 'ماسة'),
  ('souss-massa', 'Oulad Teima',           'أولاد تايمة'),
  ('souss-massa', 'Aït Iaaza',             'آيت يعزة'),
  ('souss-massa', 'Ouled Berhil',          'أولاد برحيل'),
  ('souss-massa', 'Taliouine',             'تالوين'),
  ('souss-massa', 'Aoulouz',               'أولوز'),
  ('souss-massa', 'Igherm',                'إغرم'),
  ('souss-massa', 'Tafraout',              'تافراوت'),
  ('souss-massa', 'Foum Zguid',            'فم زݣيد'),
  ('souss-massa', 'Akka',                  'أقا'),
  ('souss-massa', 'Fam El Hisn',           'فم الحصن'),
  ('souss-massa', 'Tissint',               'تيسينت'),
  ('souss-massa', 'Arazane',               'أرازان'),

  -- ===== Guelmim-Oued Noun ==================================================
  ('guelmim-oued-noun', 'Guelmim',      'كلميم'),
  ('guelmim-oued-noun', 'Tan-Tan',      'طانطان'),
  ('guelmim-oued-noun', 'Sidi Ifni',    'سيدي إفني'),
  ('guelmim-oued-noun', 'Assa',         'أسا'),
  ('guelmim-oued-noun', 'Zag',          'الزاݣ'),
  ('guelmim-oued-noun', 'Bouizakarne',  'بويزكارن'),
  ('guelmim-oued-noun', 'El Ouatia',    'الوطية'),
  ('guelmim-oued-noun', 'Mirleft',      'ميرلفت'),
  ('guelmim-oued-noun', 'Lakhsas',      'لخصاص'),
  ('guelmim-oued-noun', 'Taghjijt',     'تاغجيجت'),
  ('guelmim-oued-noun', 'Abaynou',      'أباينو'),

  -- ===== Laâyoune-Sakia El Hamra ============================================
  ('laayoune-sakia-el-hamra', 'Laâyoune',     'العيون'),
  ('laayoune-sakia-el-hamra', 'Es-Semara',    'السمارة'),
  ('laayoune-sakia-el-hamra', 'Boujdour',     'بوجدور'),
  ('laayoune-sakia-el-hamra', 'Tarfaya',      'طرفاية'),
  ('laayoune-sakia-el-hamra', 'El Marsa',     'المرسى'),
  ('laayoune-sakia-el-hamra', 'Foum El Oued', 'فم الواد'),
  ('laayoune-sakia-el-hamra', 'Akhfennir',    'أخفنير'),
  ('laayoune-sakia-el-hamra', 'Daoura',       'الدورة'),
  ('laayoune-sakia-el-hamra', 'Jdiriya',      'الجديرية'),

  -- ===== Dakhla-Oued Ed-Dahab ===============================================
  ('dakhla-oued-ed-dahab', 'Dakhla',           'الداخلة'),
  ('dakhla-oued-ed-dahab', 'Aousserd',         'أوسرد'),
  ('dakhla-oued-ed-dahab', 'El Argoub',        'العركوب'),
  ('dakhla-oued-ed-dahab', 'Bir Anzarane',     'بئر أنزران'),
  ('dakhla-oued-ed-dahab', 'Bir Gandouz',      'بئر كندوز'),
  ('dakhla-oued-ed-dahab', 'Tichla',           'تيشلة'),
  ('dakhla-oued-ed-dahab', 'Gleibat El Foula', 'ݣليبات الفولة'),
  ('dakhla-oued-ed-dahab', 'Imlili',           'إمليلي')
) as v(region_code, name_fr, name_ar)
 where c.region_code = v.region_code and c.name_fr = v.name_fr;

-- --- Contrôle ---------------------------------------------------------------
do $$
declare
  missing integer;
begin
  select count(*) into missing from public.cities where name_ar is null;
  if missing > 0 then
    raise warning 'Villes sans nom arabe : % (l''application affichera le nom français)', missing;
  end if;
  raise notice 'Toponymie arabe : % villes renseignées',
    (select count(*) from public.cities where name_ar is not null);
end;
$$;

-- =============================================================================
-- Les vues publiques exposent désormais les deux graphies. L'application
-- choisit selon la langue et retombe sur le français si l'arabe manque.
-- =============================================================================

drop view if exists public.land_listings_public;

create view public.land_listings_public
with (security_invoker = on) as
  select
    l.id,
    l.reference,
    l.title,
    l.description,
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

drop view if exists public.projects_public;

create view public.projects_public
with (security_invoker = on) as
  select
    p.id,
    p.reference,
    p.title,
    p.summary,
    p.description,
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
    ) as participants_pending
  from public.projects p
  join public.regions r on r.code = p.region_code
  left join public.cities c on c.id = p.city_id;

grant select on public.projects_public to anon, authenticated;

-- ###########################################################################
-- # 20260811100000_projects_admin.sql
-- ###########################################################################

-- =============================================================================
-- Ntcharkou — Migration 11 : le projet participatif devient un acte administratif
-- =============================================================================
-- Trois changements de fond :
--
--   1. Prix — le projet porte desormais le prix participatif ET le prix du
--      marche, tous deux saisis par l'administration. C'est ce couple qui
--      permet d'afficher l'economie realisee par l'adherent.
--
--   2. Creation — seule l'administration transforme un terrain valide en projet
--      participatif. Un particulier ne peut plus creer de projet : il exprime
--      un interet, l'administration instruit.
--
--   3. Adhesions — les candidatures remontent a l'administration, qui les
--      tranche ; le candidat est notifie de la decision.
--
-- La migration est rejouable, mais UNIQUEMENT dans l'ordre : chaque objet est
-- precede de son `drop ... if exists`, y compris sous son nouveau nom.
--
-- ⚠ Ne la rejouez pas APRES une migration ulterieure. Elle recree la vue
--   `projects_public` dans sa forme d'alors : la rejouer apres la migration 12
--   supprime les colonnes `units_reserved` / `units_pending`, et les compteurs
--   d'unites retombent a 0. Si cela arrive, rejouez simplement la migration la
--   plus recente, qui retablit la vue complete.

-- -----------------------------------------------------------------------------
-- 1. Prix et capacite d'une unite
-- -----------------------------------------------------------------------------
-- L'administration renseigne ces champs « apres etude » : le nombre d'unites
-- existe des la creation, la grille de prix peut arriver ensuite. Les colonnes
-- restent donc nullables et l'interface n'affiche le comparatif que lorsqu'il
-- est complet.

alter table public.projects
  add column if not exists unit_surface_m2 numeric(10, 2)
    check (unit_surface_m2 is null or unit_surface_m2 > 0),
  add column if not exists unit_price_per_m2 numeric(12, 2)
    check (unit_price_per_m2 is null or unit_price_per_m2 >= 0),
  add column if not exists market_price_per_m2 numeric(12, 2)
    check (market_price_per_m2 is null or market_price_per_m2 >= 0);

comment on column public.projects.unit_surface_m2 is
  'Surface moyenne d''une unite (m2), fixee par l''administration apres etude.';
comment on column public.projects.unit_price_per_m2 is
  'Prix participatif au m2 paye par l''adherent.';
comment on column public.projects.market_price_per_m2 is
  'Prix du marche au m2 pour le meme secteur — sert de reference comparative.';

-- Prix d'une unite, cote participatif et cote marche. Colonnes generees : le
-- comparatif affiche ne peut pas diverger de la grille saisie.
alter table public.projects
  add column if not exists unit_price numeric(14, 2)
    generated always as (
      case
        when unit_surface_m2 is not null and unit_price_per_m2 is not null
          then round(unit_surface_m2 * unit_price_per_m2, 2)
      end
    ) stored;

alter table public.projects
  add column if not exists market_unit_price numeric(14, 2)
    generated always as (
      case
        when unit_surface_m2 is not null and market_price_per_m2 is not null
          then round(unit_surface_m2 * market_price_per_m2, 2)
      end
    ) stored;

-- -----------------------------------------------------------------------------
-- 2. Creation reservee a l'administration
-- -----------------------------------------------------------------------------

drop policy if exists "projet : creation d'un groupe" on public.projects;
drop policy if exists "projet : creation reservee a l'administration" on public.projects;

create policy "projet : creation reservee a l'administration" on public.projects
  for insert with check (public.is_admin());

-- Le porteur ne peut plus modifier un projet : l'instruction est administrative.
drop policy if exists "projet : mise a jour" on public.projects;
drop policy if exists "projet : mise a jour par l'administration" on public.projects;
create policy "projet : mise a jour par l'administration" on public.projects
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "projet : suppression d'une proposition" on public.projects;
drop policy if exists "projet : suppression par l'administration" on public.projects;
create policy "projet : suppression par l'administration" on public.projects
  for delete using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. Vue publique : prix, economie et remplissage
-- -----------------------------------------------------------------------------
-- `units_planned` est la reference d'avancement demandee : on compare le nombre
-- d'adherents confirmes au nombre total d'unites du projet.

drop view if exists public.projects_public;

create view public.projects_public
with (security_invoker = on) as
  select
    p.id,
    p.reference,
    p.title,
    p.summary,
    p.description,
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
    -- Economie par unite, en valeur et en pourcentage du prix du marche.
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
    ) as participants_pending
  from public.projects p
  join public.regions r on r.code = p.region_code
  left join public.cities c on c.id = p.city_id;

grant select on public.projects_public to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Les candidatures remontent a l'administration
-- -----------------------------------------------------------------------------
-- Le declencheur d'origine ne prevenait que `created_by`. Les projets etant
-- desormais crees par l'administration, on notifie l'ensemble des comptes
-- administrateurs actifs — sans quoi une candidature deposee sur un projet cree
-- par un collegue passerait inapercue.

create or replace function public.trg_project_participation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  proj      public.projects;
  confirmed integer;
begin
  select * into proj from public.projects where id = coalesce(new.project_id, old.project_id);
  if not found then
    return coalesce(new, old);
  end if;

  -- Toute l'administration est prevenue d'une nouvelle demande d'adhesion.
  if tg_op = 'INSERT' then
    insert into public.notifications (profile_id, kind, title, body, url, payload)
    select pr.id,
           'candidature_recue'::public.notification_kind,
           'Nouvelle demande d''adhesion',
           format('Une demande d''adhesion vient d''etre deposee sur « %s ».', proj.title),
           '/admin/projets?projet=' || proj.id,
           jsonb_build_object('project_id', proj.id, 'participation_id', new.id)
    from public.profiles pr
    where pr.role = 'admin'
      and not pr.is_suspended
      and pr.id <> new.participant_id;
  end if;

  -- Le candidat est prevenu de la decision administrative.
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'accepte' then
      insert into public.notifications (profile_id, kind, title, body, url, payload)
      values (new.participant_id, 'candidature_acceptee',
              'Votre adhesion est validee',
              format('Vous rejoignez le projet « %s ».', proj.title),
              '/projets/' || proj.id,
              jsonb_build_object('project_id', proj.id));
    elsif new.status = 'refuse' then
      insert into public.notifications (profile_id, kind, title, body, url, payload)
      values (new.participant_id, 'candidature_refusee',
              'Votre demande d''adhesion n''a pas ete retenue',
              format('Projet « %s ».', proj.title),
              '/projets/' || proj.id,
              jsonb_build_object('project_id', proj.id));
    end if;
  end if;

  -- Groupe complet -> le projet bascule automatiquement.
  select count(*) into confirmed
  from public.project_participants
  where project_id = proj.id and status = 'accepte';

  if proj.status = 'ouvert' and confirmed >= proj.participants_target then
    update public.projects set status = 'groupe_constitue' where id = proj.id;

    insert into public.notifications (profile_id, kind, title, body, url, payload)
    select pp.participant_id, 'projet_complet'::public.notification_kind,
           'Le groupe est au complet',
           format('Le projet « %s » a reuni ses %s participants.', proj.title, proj.participants_target),
           '/projets/' || proj.id,
           jsonb_build_object('project_id', proj.id)
    from public.project_participants pp
    where pp.project_id = proj.id and pp.status = 'accepte';
  end if;

  return coalesce(new, old);
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Transformer un terrain valide en projet participatif
-- -----------------------------------------------------------------------------
-- Point d'entree unique de la creation. SECURITY DEFINER pour ecrire malgre la
-- RLS, mais le premier test est `is_admin()` : la fonction n'ouvre aucun chemin
-- detourne. Le terrain doit avoir passe la verification administrative.

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
  p_open                boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  land public.land_listings;
  new_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Reserve a l''administration.' using errcode = '42501';
  end if;

  select * into land from public.land_listings where id = p_land;
  if not found then
    raise exception 'Terrain introuvable.' using errcode = 'P0002';
  end if;

  -- Un projet ne se construit que sur un terrain dont l'administration a
  -- verifie le dossier.
  if land.status not in ('valide', 'publie') then
    raise exception 'Le terrain doit etre valide avant d''ouvrir un projet.'
      using errcode = '22023';
  end if;

  if p_units_planned is null or p_units_planned <= 0 then
    raise exception 'Le nombre d''unites doit etre positif.' using errcode = '22023';
  end if;

  insert into public.projects (
    title, summary, description,
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
    p_title, p_summary, p_description,
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

-- Mise a jour de la grille « apres etude » : unites et prix.
create or replace function public.admin_set_project_pricing(
  p_project             uuid,
  p_units_planned       integer,
  p_unit_surface_m2     numeric,
  p_unit_price_per_m2   numeric,
  p_market_price_per_m2 numeric
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

  if p_units_planned is null or p_units_planned <= 0 then
    raise exception 'Le nombre d''unites doit etre positif.' using errcode = '22023';
  end if;

  update public.projects
     set units_planned       = p_units_planned,
         participants_target = p_units_planned,
         unit_surface_m2     = p_unit_surface_m2,
         unit_price_per_m2   = p_unit_price_per_m2,
         market_price_per_m2 = p_market_price_per_m2,
         budget_per_unit     = case
           when p_unit_surface_m2 is not null and p_unit_price_per_m2 is not null
             then round(p_unit_surface_m2 * p_unit_price_per_m2, 2)
           else budget_per_unit
         end,
         updated_at          = now()
   where id = p_project;

  if not found then
    raise exception 'Projet introuvable.' using errcode = 'P0002';
  end if;

  insert into public.admin_actions (admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'projet_grille_tarifaire', 'projects', p_project,
          jsonb_build_object('units_planned', p_units_planned,
                             'unit_price_per_m2', p_unit_price_per_m2,
                             'market_price_per_m2', p_market_price_per_m2));
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Traitement administratif d'une demande d'adhesion
-- -----------------------------------------------------------------------------
-- La notification du candidat est produite par le declencheur ci-dessus : elle
-- part dans la meme transaction que la decision, donc jamais de decision
-- silencieuse.

create or replace function public.admin_decide_participation(
  p_participation uuid,
  p_accept        boolean,
  p_reason        text default null
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

  update public.project_participants
     set status     = case when p_accept then 'accepte' else 'refuse' end::public.participation_status,
         decided_at = now(),
         decided_by = auth.uid(),
         message    = coalesce(p_reason, message)
   where id = p_participation;

  if not found then
    raise exception 'Demande d''adhesion introuvable.' using errcode = 'P0002';
  end if;

  insert into public.admin_actions (admin_id, action, entity_type, entity_id, details)
  values (auth.uid(),
          case when p_accept then 'adhesion_acceptee' else 'adhesion_refusee' end,
          'project_participants', p_participation,
          jsonb_build_object('reason', p_reason));
end;
$$;

-- Liste des demandes d'adhesion en attente, pour le back-office.
create or replace function public.admin_pending_participations()
returns table (
  id             uuid,
  project_id     uuid,
  project_title  text,
  project_ref    text,
  units_planned  integer,
  participant    text,
  body           public.professional_body,
  units_wanted   integer,
  message        text,
  created_at     timestamptz
)
language sql
security definer
set search_path = public
as $$
  select pp.id,
         p.id,
         p.title,
         p.reference,
         p.units_planned,
         concat_ws(' ', pr.first_name, pr.last_name),
         part.professional_body,
         pp.units_wanted,
         pp.message,
         pp.created_at
  from public.project_participants pp
  join public.projects p  on p.id = pp.project_id
  join public.profiles pr on pr.id = pp.participant_id
  left join public.participant_profiles part on part.profile_id = pp.participant_id
  where pp.status = 'candidature'
    and public.is_admin()
  order by pp.created_at;
$$;

-- -----------------------------------------------------------------------------
-- 7. Terrains eligibles a la creation d'un projet
-- -----------------------------------------------------------------------------

create or replace function public.admin_projectable_lands()
returns table (
  id          uuid,
  reference   text,
  title       text,
  region_name text,
  city_name   text,
  surface_m2  numeric,
  zoning      public.land_zoning,
  price_per_m2 numeric,
  total_price numeric,
  estimated_units integer,
  has_project boolean
)
language sql
security definer
set search_path = public
as $$
  select l.id,
         l.reference,
         l.title,
         r.name_fr,
         c.name_fr,
         l.surface_m2,
         l.zoning,
         l.price_per_m2,
         l.total_price,
         public.estimate_units(l.surface_m2, l.zoning, l.declared_units),
         exists (select 1 from public.projects p where p.land_id = l.id)
  from public.land_listings l
  join public.regions r on r.code = l.region_code
  left join public.cities c on c.id = l.city_id
  where l.status in ('valide', 'publie')
    and public.is_admin()
  order by l.created_at desc;
$$;

-- -----------------------------------------------------------------------------
-- 8. Regions effectivement couvertes
-- -----------------------------------------------------------------------------
-- « Regions couvertes » ne doit compter que les regions ou un projet existe
-- reellement, pas les 12 regions du referentiel.

create or replace function public.public_stats()
returns table (
  lands           bigint,
  projects        bigint,
  regions_covered bigint,
  units            bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.land_listings where status = 'publie'),
    (select count(*) from public.projects
      where status in ('ouvert', 'groupe_constitue', 'en_preparation', 'realise')),
    (select count(distinct region_code) from public.projects
      where status in ('ouvert', 'groupe_constitue', 'en_preparation', 'realise')),
    (select coalesce(sum(public.estimate_units(surface_m2, zoning, declared_units)), 0)
       from public.land_listings where status = 'publie');
$$;

-- -----------------------------------------------------------------------------
-- 9. Privileges
-- -----------------------------------------------------------------------------

revoke execute on function public.admin_create_project_from_land(
  uuid, text, integer, public.property_need, text, text,
  numeric, numeric, numeric, public.professional_body, boolean) from public;
revoke execute on function public.admin_set_project_pricing(uuid, integer, numeric, numeric, numeric) from public;
revoke execute on function public.admin_decide_participation(uuid, boolean, text) from public;
revoke execute on function public.admin_pending_participations() from public;
revoke execute on function public.admin_projectable_lands() from public;
revoke execute on function public.public_stats() from public;

grant execute on function public.admin_create_project_from_land(
  uuid, text, integer, public.property_need, text, text,
  numeric, numeric, numeric, public.professional_body, boolean) to authenticated;
grant execute on function public.admin_set_project_pricing(uuid, integer, numeric, numeric, numeric) to authenticated;
grant execute on function public.admin_decide_participation(uuid, boolean, text) to authenticated;
grant execute on function public.admin_pending_participations() to authenticated;
grant execute on function public.admin_projectable_lands() to authenticated;
grant execute on function public.public_stats() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 10. Rupture d'un cycle entre politiques RLS
-- -----------------------------------------------------------------------------
-- `projects` autorisait la lecture a un membre du groupe en interrogeant
-- `project_participants`, dont la propre politique interrogeait `projects` :
-- PostgreSQL detecte la boucle et refuse la requete
-- (« infinite recursion detected in policy »). Tout SELECT sur l'une des deux
-- tables par un compte authentifie echouait donc — la page « Mes projets »
-- comprise. On casse le cycle avec une fonction SECURITY DEFINER : elle
-- s'execute avec les droits du proprietaire, qui ne declenche pas la RLS, et la
-- politique n'a plus besoin de traverser l'autre table.

create or replace function public.is_project_member(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_participants
    where project_id = p_project
      and participant_id = auth.uid()
  );
$$;

comment on function public.is_project_member is
  'Appartenance a un groupe de projet, sans traverser la RLS — evite le cycle de politiques.';

drop policy if exists "projet : lecture" on public.projects;
create policy "projet : lecture" on public.projects
  for select using (
    status in ('ouvert', 'groupe_constitue', 'en_preparation', 'realise')
    or created_by = auth.uid()
    or public.is_admin()
    or public.is_project_member(projects.id)
  );

-- Cote participations, la branche « porteur du projet » n'a plus d'objet : le
-- porteur est desormais l'administration, deja couverte par is_admin().
drop policy if exists "participation : lecture" on public.project_participants;
create policy "participation : lecture" on public.project_participants
  for select using (participant_id = auth.uid() or public.is_admin());

drop policy if exists "participation : mise a jour" on public.project_participants;
create policy "participation : mise a jour" on public.project_participants
  for update using (participant_id = auth.uid() or public.is_admin())
  with check (participant_id = auth.uid() or public.is_admin());

revoke execute on function public.is_project_member(uuid) from public;
grant execute on function public.is_project_member(uuid) to anon, authenticated;

-- ###########################################################################
-- # 20260811110000_units_reserved.sql
-- ###########################################################################

-- =============================================================================
-- Ntcharkou — Migration 12 : compter les unites reservees, pas les adherents
-- =============================================================================
-- Un adherent peut demander plusieurs unites. L'avancement d'un projet se
-- mesure donc en unites, pas en personnes : un adherent ayant obtenu 2 unites
-- en consomme 2 sur les N du projet.
--
-- La vue publiait `participants_confirmed` (un `count(*)`), que l'interface
-- affichait comme un nombre d'unites — d'ou « 1 / 20 » pour une adhesion de
-- 2 unites. On expose desormais les deux grandeurs, distinctes et nommees :
--   · participants_confirmed / participants_pending -> des personnes
--   · units_reserved / units_pending                -> des unites
--
-- Meme correction pour la constitution automatique du groupe, qui comparait un
-- nombre de personnes a un nombre d'unites : un projet de 20 unites se serait
-- declare complet avec 20 adherents ayant reserve 35 unites.
--
-- La migration est rejouable.

-- -----------------------------------------------------------------------------
-- 1. Vue publique : unites reservees et unites en attente
-- -----------------------------------------------------------------------------

drop view if exists public.projects_public;

create view public.projects_public
with (security_invoker = on) as
  select
    p.id,
    p.reference,
    p.title,
    p.summary,
    p.description,
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
    -- Des personnes.
    (
      select count(*) from public.project_participants pp
      where pp.project_id = p.id and pp.status = 'accepte'
    ) as participants_confirmed,
    (
      select count(*) from public.project_participants pp
      where pp.project_id = p.id and pp.status = 'candidature'
    ) as participants_pending,
    -- Des unites : c'est ce qui remplit le projet.
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
-- 2. Constitution automatique du groupe, mesuree en unites
-- -----------------------------------------------------------------------------

create or replace function public.trg_project_participation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  proj     public.projects;
  reserved integer;
begin
  select * into proj from public.projects where id = coalesce(new.project_id, old.project_id);
  if not found then
    return coalesce(new, old);
  end if;

  -- Toute l'administration est prevenue d'une nouvelle demande d'adhesion.
  if tg_op = 'INSERT' then
    insert into public.notifications (profile_id, kind, title, body, url, payload)
    select pr.id,
           'candidature_recue'::public.notification_kind,
           'Nouvelle demande d''adhesion',
           format('Une demande d''adhesion de %s unite(s) vient d''etre deposee sur « %s ».',
                  new.units_wanted, proj.title),
           '/admin/adhesions',
           jsonb_build_object('project_id', proj.id, 'participation_id', new.id)
    from public.profiles pr
    where pr.role = 'admin'
      and not pr.is_suspended
      and pr.id <> new.participant_id;
  end if;

  -- Le candidat est prevenu de la decision administrative.
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'accepte' then
      insert into public.notifications (profile_id, kind, title, body, url, payload)
      values (new.participant_id, 'candidature_acceptee',
              'Votre adhesion est validee',
              format('Vous rejoignez le projet « %s » pour %s unite(s).',
                     proj.title, new.units_wanted),
              '/projets/' || proj.id,
              jsonb_build_object('project_id', proj.id));
    elsif new.status = 'refuse' then
      insert into public.notifications (profile_id, kind, title, body, url, payload)
      values (new.participant_id, 'candidature_refusee',
              'Votre demande d''adhesion n''a pas ete retenue',
              format('Projet « %s ».', proj.title),
              '/projets/' || proj.id,
              jsonb_build_object('project_id', proj.id));
    end if;
  end if;

  -- Le groupe est complet quand toutes les UNITES sont reservees.
  select coalesce(sum(units_wanted), 0) into reserved
  from public.project_participants
  where project_id = proj.id and status = 'accepte';

  if proj.status = 'ouvert' and reserved >= proj.units_planned then
    update public.projects set status = 'groupe_constitue' where id = proj.id;

    insert into public.notifications (profile_id, kind, title, body, url, payload)
    select pp.participant_id, 'projet_complet'::public.notification_kind,
           'Le groupe est au complet',
           format('Les %s unites du projet « %s » sont reservees.',
                  proj.units_planned, proj.title),
           '/projets/' || proj.id,
           jsonb_build_object('project_id', proj.id)
    from public.project_participants pp
    where pp.project_id = proj.id and pp.status = 'accepte';
  end if;

  return coalesce(new, old);
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. File d'attente administrative : montrer le remplissage en unites
-- -----------------------------------------------------------------------------
-- L'administration doit voir, avant de trancher, combien d'unites restent
-- reellement disponibles — accepter 3 unites sur un projet qui n'en a plus que
-- 2 est une decision qu'on ne peut pas rattraper silencieusement.

drop function if exists public.admin_pending_participations();

create function public.admin_pending_participations()
returns table (
  id             uuid,
  project_id     uuid,
  project_title  text,
  project_ref    text,
  units_planned  integer,
  units_reserved bigint,
  participant    text,
  body           public.professional_body,
  units_wanted   integer,
  message        text,
  created_at     timestamptz
)
language sql
security definer
set search_path = public
as $$
  select pp.id,
         p.id,
         p.title,
         p.reference,
         p.units_planned,
         (select coalesce(sum(x.units_wanted), 0) from public.project_participants x
           where x.project_id = p.id and x.status = 'accepte'),
         concat_ws(' ', pr.first_name, pr.last_name),
         part.professional_body,
         pp.units_wanted,
         pp.message,
         pp.created_at
  from public.project_participants pp
  join public.projects p  on p.id = pp.project_id
  join public.profiles pr on pr.id = pp.participant_id
  left join public.participant_profiles part on part.profile_id = pp.participant_id
  where pp.status = 'candidature'
    and public.is_admin()
  order by pp.created_at;
$$;

revoke execute on function public.admin_pending_participations() from public;
grant execute on function public.admin_pending_participations() to authenticated;

-- ###########################################################################
-- # 20260811120000_arabic_content.sql
-- ###########################################################################

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

-- ###########################################################################
-- # 20260811130000_geo_and_conversion.sql
-- ###########################################################################

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
-- 0. Colonnes attendues des migrations precedentes
-- -----------------------------------------------------------------------------
-- Cette migration reconstruit les vues publiques, et y reprend les colonnes
-- arabes introduites par la migration 13. Appliquee sans elle, elle echouait a
-- mi-parcours sur « column l.title_ar does not exist » — en laissant la base
-- dans un etat partiel.
--
-- On s'assure donc de leur presence. Ces `add column if not exists` ne font
-- rien quand la migration 13 est deja passee ; ils evitent un echec quand elle
-- a ete sautee. Ils ne remplacent pas la migration 13 pour autant : ses
-- fonctions (dont `admin_set_project_texts`) restent a appliquer.

alter table public.land_listings
  add column if not exists title_ar        text,
  add column if not exists description_ar  text,
  add column if not exists observations_ar text;

alter table public.projects
  add column if not exists title_ar       text,
  add column if not exists summary_ar     text,
  add column if not exists description_ar text;

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

-- La fonction `lands_in_bounds` ne renvoie plus `setof public.land_listings_public`
-- (voir plus bas) : la vue n'a donc plus de dependante et se recree librement.
-- L'ancienne signature, elle, dependait du type de la vue et doit partir.
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
--
-- Le type de retour est declare colonne par colonne, et non `setof
-- land_listings_public`. Dependre du type de la vue empechait de la recreer
-- (« cannot drop view ... because other objects depend on it ») : toute
-- migration ulterieure touchant la vue se serait heurtee au meme mur. La
-- fonction ne renvoie d'ailleurs que ce dont la carte a besoin.

create or replace function public.lands_in_bounds(
  p_west  double precision,
  p_south double precision,
  p_east  double precision,
  p_north double precision,
  p_limit integer default 300
)
returns table (
  id              uuid,
  reference       text,
  title           text,
  title_ar        text,
  market_status   public.land_market_status,
  zoning          public.land_zoning,
  zonings         public.land_zoning[],
  surface_m2      numeric,
  parcel_area_m2  numeric,
  price_per_m2    numeric,
  total_price     numeric,
  has_water       boolean,
  has_electricity boolean,
  has_sewage      boolean,
  parcel          jsonb,
  map_lat         double precision,
  map_lng         double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select l.id,
         l.reference,
         l.title,
         nullif(btrim(coalesce(l.title_ar, '')), ''),
         l.market_status,
         l.zoning,
         coalesce(l.zonings, array[l.zoning]),
         l.surface_m2,
         l.parcel_area_m2,
         l.price_per_m2,
         l.total_price,
         l.has_water,
         l.has_electricity,
         l.has_sewage,
         case when l.parcel is not null then st_asgeojson(l.parcel)::jsonb end,
         case when l.parcel is not null then st_y(st_centroid(l.parcel)) else l.latitude end,
         case when l.parcel is not null then st_x(st_centroid(l.parcel)) else l.longitude end
  from public.land_listings l
  where l.status = 'publie'
    and l.market_status <> 'masque'
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

commit;

-- =============================================================================
-- Étape suivante : désigner le premier administrateur.
--
-- Inscrivez-vous via l'interface, puis exécutez ici :
--
--   update public.profiles set role = 'admin' where email = 'vous@exemple.ma';
--
-- Le déclencheur `guard_profile_privileges` empêche un utilisateur de changer
-- son propre rôle, mais laisse passer les requêtes sans session (console SQL,
-- `service_role`) : c'est ce chemin qui permet ce premier amorçage.
-- =============================================================================
