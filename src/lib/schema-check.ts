import { createSupabaseServerClient, isSupabaseConfigured } from './supabase/server'

/**
 * Ce que le code attend de la base, et qui peut ne pas y être.
 *
 * Le code est déployé avant que sa migration ne soit appliquée : la vue ne
 * publie pas encore la colonne, la valeur arrive `undefined`, et l'interface
 * affiche 0 — un chiffre plausible, donc indétectable à l'œil. C'est exactement
 * ce qui s'est produit sur le compteur d'unités réservées : rien ne distinguait
 * « aucune unité réservée » de « colonne absente ».
 *
 * On sonde donc la base, et le back-office affiche la migration manquante.
 * Une requête par sonde, limitée à une ligne, sur des écrans déjà réservés à
 * l'administration.
 */
export interface SchemaGap {
  column: string
  migration: string
}

interface Probe extends SchemaGap {
  /** Vue ou table interrogée. */
  relation: string
}

const EXPECTED: Probe[] = [
  {
    column: 'parcel',
    relation: 'land_listings_public',
    migration: '20260811130000_geo_and_conversion.sql',
  },
  {
    column: 'title_ar',
    relation: 'projects_public',
    migration: '20260811120000_arabic_content.sql',
  },
  {
    column: 'units_reserved',
    relation: 'projects_public',
    migration: '20260811110000_units_reserved.sql',
  },
  {
    column: 'unit_price',
    relation: 'projects_public',
    migration: '20260811100000_projects_admin.sql',
  },
  // Le blog ajoute une table entière : c'est la relation elle-même qui manque
  // tant que la migration n'est pas appliquée, pas seulement une colonne.
  { column: 'blog_posts', relation: 'blog_posts_public', migration: '20260811160000_blog.sql' },
]

/**
 * Reconnaît une absence de colonne ou de relation.
 *
 * Toute autre erreur (réseau, droits, RLS) ne doit pas se déguiser en migration
 * manquante : signaler une migration déjà appliquée enverrait chercher au
 * mauvais endroit.
 */
function missing(error: { message: string; code?: string }): boolean {
  const text = `${error.message} ${error.code ?? ''}`
  // 42703 : colonne inconnue. 42P01 / PGRST205 : relation inconnue.
  return /does not exist|42703|42P01|PGRST205|Could not find the table/i.test(text)
}

export async function findSchemaGaps(): Promise<SchemaGap[]> {
  if (!isSupabaseConfigured()) return []

  try {
    const supabase = await createSupabaseServerClient()
    const gaps: SchemaGap[] = []

    for (const probe of EXPECTED) {
      // Une table absente se sonde sur une colonne sûre : c'est la relation
      // qu'on cherche, pas la colonne.
      const column = probe.column === 'blog_posts' ? 'slug' : probe.column
      const { error } = await supabase.from(probe.relation).select(column).limit(1)
      if (error && missing(error)) {
        gaps.push({ column: probe.column, migration: probe.migration })
      }
    }

    return gaps
  } catch {
    return []
  }
}
