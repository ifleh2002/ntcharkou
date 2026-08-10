import type {
  LandZoning,
  LegalStatus,
  ListingStatus,
  MatchStatus,
  NotificationKind,
  OwnerKind,
  ParticipationStatus,
  ProfessionalBody,
  ProjectStatus,
  PropertyNeed,
  ReportReason,
  RequestStatus,
  SameBodyPreference,
  UserRole,
} from './types'

export const ROLE_LABELS: Record<UserRole, string> = {
  participant: 'Participant',
  owner: 'Propriétaire',
  admin: 'Administrateur',
}

export const OWNER_KIND_LABELS: Record<OwnerKind, string> = {
  particulier: 'Propriétaire particulier',
  societe: 'Société',
  heritiers: 'Héritiers / indivision',
  mandataire: 'Mandataire',
}

export const ZONING_LABELS: Record<LandZoning, string> = {
  residentiel: 'Terrain résidentiel',
  r2: 'R+2',
  r3: 'R+3',
  r4: 'R+4',
  villa: 'Villa',
  lotissement: 'Lotissement',
  immeuble: 'Immeuble',
  commercial: 'Commercial',
  industriel: 'Industriel',
  agricole: 'Agricole',
  autre: 'Autre',
}

export const ZONING_ORDER: LandZoning[] = [
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
  'autre',
]

export const LEGAL_STATUS_LABELS: Record<LegalStatus, string> = {
  titre_foncier: 'Titre foncier',
  requisition: 'Réquisition en cours',
  melkia: 'Melkia / acte adoulaire',
  habous: 'Habous',
  collectif: 'Terrain collectif',
  autre: 'Autre',
}

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  brouillon: 'Brouillon',
  soumis: 'Soumis',
  en_verification: 'En vérification',
  valide: 'Validé',
  publie: 'Publié',
  refuse: 'Refusé',
  archive: 'Archivé',
}

/** Ordre du workflow de validation d'un terrain (section 14). */
export const LISTING_WORKFLOW: ListingStatus[] = [
  'brouillon',
  'soumis',
  'en_verification',
  'valide',
  'publie',
]

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  proposition: 'Proposition',
  analyse: 'Analyse',
  validation_admin: 'Validation administrative',
  ouvert: 'Ouvert aux participants',
  groupe_constitue: 'Groupe constitué',
  en_preparation: 'Projet en préparation',
  realise: 'Projet réalisé',
  annule: 'Annulé',
}

export const PROJECT_WORKFLOW: ProjectStatus[] = [
  'proposition',
  'analyse',
  'validation_admin',
  'ouvert',
  'groupe_constitue',
  'en_preparation',
  'realise',
]

export const PROPERTY_NEED_LABELS: Record<PropertyNeed, string> = {
  appartement_immeuble: 'Appartement dans un immeuble',
  appartement_r2: 'Appartement dans un R+2',
  appartement_residence_fermee: 'Appartement dans une résidence fermée',
  terrain_r2: 'Terrain R+2',
  terrain_r3: 'Terrain R+3',
  terrain_r4: 'Terrain R+4',
  terrain_villa: 'Terrain villa',
  mini_ferme: 'Mini-ferme',
  villa_semi_finie: 'Villa semi-finie',
  terrain_industriel: 'Terrain industriel',
}

/** Regroupement utilise par le formulaire participant (section 6). */
export const PROPERTY_NEED_GROUPS: { label: string; icon: string; needs: PropertyNeed[] }[] = [
  {
    label: 'Logement collectif',
    icon: '🏢',
    needs: ['appartement_immeuble', 'appartement_r2', 'appartement_residence_fermee'],
  },
  {
    label: 'Terrain / construction',
    icon: '🏗️',
    needs: ['terrain_r2', 'terrain_r3', 'terrain_r4', 'terrain_villa'],
  },
  {
    label: 'Autres',
    icon: '🏡',
    needs: ['mini_ferme', 'villa_semi_finie', 'terrain_industriel'],
  },
]

export const PROFESSIONAL_BODY_LABELS: Record<ProfessionalBody, string> = {
  medecin: 'Médecin',
  pharmacien: 'Pharmacien',
  enseignant: 'Enseignant',
  ingenieur: 'Ingénieur',
  fonctionnaire: 'Fonctionnaire',
  entrepreneur: 'Entrepreneur',
  cadre: 'Cadre',
  autre: 'Autre',
}

/** Pluriel utilise pour nommer un groupe : « Projet Médecins — Rabat ». */
export const PROFESSIONAL_BODY_PLURAL: Record<ProfessionalBody, string> = {
  medecin: 'Médecins',
  pharmacien: 'Pharmaciens',
  enseignant: 'Enseignants',
  ingenieur: 'Ingénieurs',
  fonctionnaire: 'Fonctionnaires',
  entrepreneur: 'Entrepreneurs',
  cadre: 'Cadres',
  autre: 'Participants',
}

export const SAME_BODY_LABELS: Record<SameBodyPreference, string> = {
  oui: 'Oui, uniquement avec le même corps professionnel',
  non: 'Non',
  indifferent: 'Indifférent',
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  brouillon: 'Brouillon',
  active: 'Active',
  en_pause: 'En pause',
  satisfaite: 'Satisfaite',
  archivee: 'Archivée',
}

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  nouveau: 'Nouveau',
  vu: 'Vu',
  interesse: 'Intéressé',
  refuse: 'Écarté',
  converti: 'Converti en projet',
}

export const PARTICIPATION_STATUS_LABELS: Record<ParticipationStatus, string> = {
  candidature: 'Candidature en attente',
  accepte: 'Accepté',
  refuse: 'Refusé',
  retire: 'Retiré',
}

export const NOTIFICATION_ICONS: Record<NotificationKind, string> = {
  nouveau_match_terrain: '🔔',
  nouveau_match_demande: '📋',
  terrain_valide: '✅',
  terrain_refuse: '⛔',
  projet_ouvert: '🏗️',
  candidature_recue: '📨',
  candidature_acceptee: '🎉',
  candidature_refusee: '📪',
  projet_complet: '🥳',
  systeme: 'ℹ️',
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  annonce_frauduleuse: 'Annonce frauduleuse',
  prix_incoherent: 'Prix incohérent',
  doublon: 'Doublon',
  contenu_inapproprie: 'Contenu inapproprié',
  coordonnees_visibles: 'Coordonnées personnelles visibles',
  autre: 'Autre',
}

export const CRITERION_LABELS: Record<string, string> = {
  region: 'Région',
  ville: 'Ville',
  type: 'Type de projet',
  zonage: 'Zonage',
  budget: 'Budget',
  unites: "Nombre d'unités",
  reseaux: 'Réseaux',
}
