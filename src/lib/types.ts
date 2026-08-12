// =============================================================================
// Types metier — miroir TypeScript du schema PostgreSQL.
// (`npx supabase gen types typescript` peut regenerer une version exhaustive ;
//  ce fichier reste la reference lisible cote application.)
// =============================================================================

import type { GeoPolygon } from './map'

export type UserRole = 'participant' | 'owner' | 'admin'

export type OwnerKind = 'particulier' | 'societe' | 'heritiers' | 'mandataire'

export type LandZoning =
  | 'residentiel'
  | 'r2'
  | 'r3'
  | 'r4'
  | 'villa'
  | 'lotissement'
  | 'immeuble'
  | 'commercial'
  | 'industriel'
  | 'agricole'
  | 'autre'

export type LegalStatus =
  | 'titre_foncier'
  | 'requisition'
  | 'melkia'
  | 'habous'
  | 'collectif'
  | 'autre'

export type ListingStatus =
  | 'brouillon'
  | 'soumis'
  | 'en_verification'
  | 'valide'
  | 'publie'
  | 'refuse'
  | 'archive'

export type ProjectStatus =
  | 'proposition'
  | 'analyse'
  | 'validation_admin'
  | 'ouvert'
  | 'groupe_constitue'
  | 'en_preparation'
  | 'realise'
  | 'annule'

export type PropertyNeed =
  | 'appartement_immeuble'
  | 'appartement_r2'
  | 'appartement_residence_fermee'
  | 'terrain_r2'
  | 'terrain_r3'
  | 'terrain_r4'
  | 'terrain_villa'
  | 'mini_ferme'
  | 'villa_semi_finie'
  | 'terrain_industriel'

export type ProfessionalBody =
  | 'medecin'
  | 'pharmacien'
  | 'enseignant'
  | 'ingenieur'
  | 'fonctionnaire'
  | 'entrepreneur'
  | 'cadre'
  | 'autre'

export type LandMarketStatus =
  | 'disponible'
  | 'en_negociation'
  | 'reserve'
  | 'vendu'
  | 'masque'

export type SameBodyPreference = 'oui' | 'non' | 'indifferent'
export type RequestStatus = 'brouillon' | 'active' | 'en_pause' | 'satisfaite' | 'archivee'
export type MatchStatus = 'nouveau' | 'vu' | 'interesse' | 'refuse' | 'converti'
export type ParticipationStatus = 'candidature' | 'accepte' | 'refuse' | 'retire'

export type NotificationKind =
  | 'nouveau_match_terrain'
  | 'nouveau_match_demande'
  | 'terrain_valide'
  | 'terrain_refuse'
  | 'projet_ouvert'
  | 'candidature_recue'
  | 'candidature_acceptee'
  | 'candidature_refusee'
  | 'projet_complet'
  | 'systeme'

export type ReportReason =
  | 'annonce_frauduleuse'
  | 'prix_incoherent'
  | 'doublon'
  | 'contenu_inapproprie'
  | 'coordonnees_visibles'
  | 'autre'

// -----------------------------------------------------------------------------

export interface Region {
  code: string
  name_fr: string
  name_ar: string | null
  sort_order: number
  /** Nom résolu selon la langue de la requête (voir `src/lib/queries.ts`). */
  name: string
}

export interface City {
  id: string
  region_code: string
  name_fr: string
  name_ar: string | null
  is_major: boolean
  /** Nom résolu selon la langue de la requête. */
  name: string
}

export interface Profile {
  id: string
  role: UserRole
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  region_code: string | null
  city_id: string | null
  district: string | null
  avatar_url: string | null
  is_suspended: boolean
  created_at: string
}

export interface OwnerProfile {
  profile_id: string
  owner_kind: OwnerKind
  company_name: string | null
  cin_number: string | null
  cin_document_path: string | null
  is_verified: boolean
}

export interface ParticipantProfile {
  profile_id: string
  professional_status: string | null
  professional_body: ProfessionalBody
  professional_body_other: string | null
  employer: string | null
}

/** Ligne de la vue `land_listings_public` (region/ville resolues, capacite estimee). */
export interface LandListingPublic {
  id: string
  reference: string | null
  title: string
  /** Graphie arabe du contenu rédigé ; vide, le français sert de repli. */
  title_ar: string | null
  description: string | null
  description_ar: string | null
  region_code: string
  region_name: string
  region_name_ar: string | null
  city_id: string | null
  city_name: string | null
  city_name_ar: string | null
  district: string | null
  latitude: number | null
  longitude: number | null
  zoning: LandZoning
  /** Ensemble des zonages ; `zoning` reste le principal. */
  zonings: LandZoning[] | null
  surface_m2: number
  facade_m: number | null
  depth_m: number | null
  facade_count: number | null
  road_width_m: number | null
  legal_status: LegalStatus | null
  observations: string | null
  observations_ar: string | null
  price_per_m2: number | null
  total_price: number | null
  price_negotiable: boolean
  has_water: boolean
  has_electricity: boolean
  has_sewage: boolean
  has_telecom: boolean
  has_gas: boolean
  network_other: string | null
  estimated_units: number | null
  status: ListingStatus
  /** Axe distinct du statut de publication : c'est lui qui colore la carte. */
  market_status: LandMarketStatus
  parcel: GeoPolygon | null
  parcel_area_m2: number | null
  parcel_perimeter_m: number | null
  map_lat: number | null
  map_lng: number | null
  published_at: string | null
  created_at: string
  view_count: number
  cover_image_path: string | null
  image_count: number
}

export interface ParticipantRequest {
  id: string
  participant_id: string
  reference: string | null
  title: string
  notes: string | null
  region_code: string | null
  city_id: string | null
  district: string | null
  property_needs: PropertyNeed[]
  budget_total_min: number | null
  budget_total_max: number | null
  budget_per_unit_min: number | null
  budget_per_unit_max: number | null
  units_wanted: number | null
  surface_min_m2: number | null
  surface_max_m2: number | null
  same_body_preference: SameBodyPreference
  preferred_body: ProfessionalBody | null
  requires_water: boolean
  requires_electricity: boolean
  requires_sewage: boolean
  status: RequestStatus
  created_at: string
}

/** Ligne de la vue `projects_public`. */
export interface ProjectPublic {
  id: string
  reference: string | null
  title: string
  /** Graphie arabe du contenu rédigé ; vide, le français sert de repli. */
  title_ar: string | null
  summary: string | null
  summary_ar: string | null
  description: string | null
  description_ar: string | null
  region_code: string
  region_name: string
  region_name_ar: string | null
  city_id: string | null
  city_name: string | null
  city_name_ar: string | null
  district: string | null
  property_need: PropertyNeed
  zoning: LandZoning | null
  units_planned: number
  participants_target: number
  budget_per_unit: number | null
  /** Grille tarifaire fixée par l'administration après étude. */
  unit_surface_m2: number | null
  unit_price_per_m2: number | null
  market_price_per_m2: number | null
  unit_price: number | null
  market_unit_price: number | null
  /** Écart au prix du marché, calculé par la vue — jamais saisi. */
  savings_amount: number | null
  savings_percent: number | null
  restricted_to_body: ProfessionalBody | null
  status: ProjectStatus
  land_id: string | null
  cover_image_path: string | null
  opened_at: string | null
  created_at: string
  /** Des personnes. */
  participants_confirmed: number
  participants_pending: number
  /** Des unités — c'est ce qui remplit le projet. Un adhérent peut en réserver plusieurs. */
  units_reserved: number
  units_pending: number
}

export interface MatchCriterion {
  weight: number
  score: number
  points: number
}

export type MatchBreakdown = Partial<
  Record<'region' | 'ville' | 'type' | 'zonage' | 'budget' | 'unites' | 'reseaux', MatchCriterion>
>

export interface Match {
  id: string
  request_id: string
  land_id: string
  score: number
  breakdown: MatchBreakdown
  status: MatchStatus
  notified_at: string | null
  viewed_at: string | null
  created_at: string
}

export interface AppNotification {
  id: string
  profile_id: string
  kind: NotificationKind
  title: string
  body: string | null
  url: string | null
  payload: Record<string, unknown>
  read_at: string | null
  created_at: string
}

export interface ProjectParticipation {
  id: string
  project_id: string
  participant_id: string
  request_id: string | null
  units_wanted: number
  message: string | null
  status: ParticipationStatus
  created_at: string
}
