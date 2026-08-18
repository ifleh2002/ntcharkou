// =============================================================================
// Ce module ne contient plus de texte : les libellés vivent dans les
// dictionnaires (`src/lib/i18n/dictionaries`). Restent ici les données de
// structure, identiques dans toutes les langues : ordres d'affichage,
// regroupements et pictogrammes.
// =============================================================================

import type {
  BlogCategory,
  LandZoning,
  ListingStatus,
  NotificationKind,
  ProjectStatus,
  PropertyNeed,
} from './types'

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

/** Ordre du workflow de validation d'un terrain (section 14). */
export const LISTING_WORKFLOW: ListingStatus[] = [
  'brouillon',
  'soumis',
  'en_verification',
  'valide',
  'publie',
]

export const PROJECT_WORKFLOW: ProjectStatus[] = [
  'proposition',
  'analyse',
  'validation_admin',
  'ouvert',
  'groupe_constitue',
  'en_preparation',
  'realise',
]

export const PROPERTY_NEED_ORDER: PropertyNeed[] = [
  'appartement_immeuble',
  'appartement_r2',
  'appartement_residence_fermee',
  'terrain_r2',
  'terrain_r3',
  'terrain_r4',
  'terrain_villa',
  'mini_ferme',
  'villa_semi_finie',
  'terrain_industriel',
]

/** Regroupement utilisé par le formulaire participant (section 6). */
export const PROPERTY_NEED_GROUPS: {
  key: 'collective' | 'land' | 'other'
  icon: string
  needs: PropertyNeed[]
}[] = [
  {
    key: 'collective',
    icon: '🏢',
    needs: ['appartement_immeuble', 'appartement_r2', 'appartement_residence_fermee'],
  },
  {
    key: 'land',
    icon: '🏗️',
    needs: ['terrain_r2', 'terrain_r3', 'terrain_r4', 'terrain_villa'],
  },
  {
    key: 'other',
    icon: '🏡',
    needs: ['mini_ferme', 'villa_semi_finie', 'terrain_industriel'],
  },
]

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

/** Pondération du moteur de matching, affichée dans l'interface. */
export const CRITERION_WEIGHTS: { key: keyof typeof CRITERION_KEYS; weight: number }[] = [
  { key: 'region', weight: 20 },
  { key: 'ville', weight: 15 },
  { key: 'type', weight: 20 },
  { key: 'zonage', weight: 15 },
  { key: 'budget', weight: 15 },
  { key: 'unites', weight: 10 },
  { key: 'reseaux', weight: 5 },
]

const CRITERION_KEYS = {
  region: true,
  ville: true,
  type: true,
  zonage: true,
  budget: true,
  unites: true,
  reseaux: true,
} as const

/**
 * Ordre d'affichage des rubriques du blog.
 *
 * De la règle au geste : ce qui encadre l'achat vient avant ce qui l'aide à se
 * faire, et le logement participatif ferme la liste puisqu'il en est la
 * synthèse.
 */
export const BLOG_CATEGORY_ORDER: BlogCategory[] = [
  'reglementation',
  'financement',
  'marche',
  'conseils',
  'participatif',
]

/**
 * Couleur de la pastille d'une rubrique.
 *
 * Constante : la même rubrique doit se reconnaître d'une liste à l'autre, et
 * dans le back-office comme sur le site.
 */
export const BLOG_CATEGORY_TONE: Record<BlogCategory, 'argile' | 'zellige' | 'safran' | 'neutre'> =
  {
    reglementation: 'neutre',
    financement: 'safran',
    marche: 'argile',
    conseils: 'zellige',
    participatif: 'argile',
  }
