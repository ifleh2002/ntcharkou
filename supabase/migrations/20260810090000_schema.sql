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
