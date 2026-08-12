import { createSupabaseServerClient, isSupabaseConfigured } from './supabase/server'

/**
 * Colonnes attendues par le code mais absentes de la base.
 *
 * Le code est déployé avant que sa migration ne soit appliquée : la vue ne
 * publie pas encore la colonne, la valeur arrive `undefined`, et l'interface
 * affiche 0 — un chiffre plausible, donc indétectable à l'œil. C'est exactement
 * ce qui s'est produit sur le compteur d'unités réservées : rien ne distinguait
 * « aucune unité réservée » de « colonne absente ».
 *
 * On sonde donc la vue, et le back-office affiche la migration manquante.
 * Une seule requête, limitée à une ligne, sur des écrans déjà réservés à
 * l'administration.
 */
export interface SchemaGap {
  column: string
  migration: string
}

const EXPECTED: SchemaGap[] = [
  { column: 'units_reserved', migration: '20260811110000_units_reserved.sql' },
  { column: 'unit_price', migration: '20260811100000_projects_admin.sql' },
]

export async function findSchemaGaps(): Promise<SchemaGap[]> {
  if (!isSupabaseConfigured()) return []

  try {
    const supabase = await createSupabaseServerClient()
    const gaps: SchemaGap[] = []

    for (const expected of EXPECTED) {
      const { error } = await supabase
        .from('projects_public')
        .select(expected.column)
        .limit(1)
      // PostgREST refuse la requête si la colonne n'existe pas ; toute autre
      // erreur (réseau, droits) ne doit pas se déguiser en migration manquante.
      if (error && /column|does not exist|42703/i.test(`${error.message} ${error.code ?? ''}`)) {
        gaps.push(expected)
      }
    }

    return gaps
  } catch {
    return []
  }
}
