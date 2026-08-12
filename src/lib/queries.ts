import { DEFAULT_LOCALE, type Locale } from './i18n/config'
import { normalizeCounters } from './project-counters'
import { createSupabaseServerClient, isSupabaseConfigured } from './supabase/server'
import type {
  City,
  LandListingPublic,
  LandZoning,
  ProjectPublic,
  PropertyNeed,
  Region,
} from './types'

/**
 * Le référentiel et les vues publiques portent les deux graphies. On résout ici
 * le nom à afficher, une bonne fois, plutôt qu'à chaque endroit de l'interface :
 * les composants lisent `region_name` / `city_name` / `name` sans se soucier de
 * la langue. Le français sert de repli quand l'arabe manque.
 */
function pickName(locale: Locale, fr: string | null, ar: string | null): string {
  if (locale === 'ar') return ar || fr || ''
  return fr || ar || ''
}

function localizeLand(land: LandListingPublic, locale: Locale): LandListingPublic {
  return {
    ...land,
    region_name: pickName(locale, land.region_name, land.region_name_ar),
    city_name: land.city_name || land.city_name_ar
      ? pickName(locale, land.city_name, land.city_name_ar)
      : null,
  }
}

/**
 * Normalise une ligne de `projects_public` : nom de region/ville selon la langue,
 * et compteurs ramenes a des nombres (cf. `project-counters.ts`).
 */
export function localizeProject(project: ProjectPublic, locale: Locale): ProjectPublic {
  return {
    ...project,
    region_name: pickName(locale, project.region_name, project.region_name_ar),
    city_name: project.city_name || project.city_name_ar
      ? pickName(locale, project.city_name, project.city_name_ar)
      : null,
    ...normalizeCounters(project),
  }
}

/** Toutes les lectures publiques passent par ici : une base non configuree ou
 *  une erreur reseau doit degrader l'affichage, jamais casser la page. */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!isSupabaseConfigured()) return fallback
  try {
    return await fn()
  } catch (error) {
    console.error('[ntcharkou] lecture Supabase impossible :', error)
    return fallback
  }
}

export async function getRegions(locale: Locale = DEFAULT_LOCALE): Promise<Region[]> {
  return safe(async () => {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.from('regions').select('*').order('sort_order')
    return ((data ?? []) as Region[]).map((region) => ({
      ...region,
      name: pickName(locale, region.name_fr, region.name_ar),
    }))
  }, [])
}

export async function getCities(
  locale: Locale = DEFAULT_LOCALE,
  regionCode?: string | null,
): Promise<City[]> {
  return safe(async () => {
    const supabase = await createSupabaseServerClient()
    let query = supabase.from('cities').select('*')
    if (regionCode) query = query.eq('region_code', regionCode)
    const { data } = await query
    const cities = ((data ?? []) as City[]).map((city) => ({
      ...city,
      name: pickName(locale, city.name_fr, city.name_ar),
    }))
    // Tri dans la langue affichée : l'ordre alphabétique arabe diffère du latin.
    const collator = new Intl.Collator(locale === 'ar' ? 'ar' : 'fr')
    return cities.sort((a, b) => collator.compare(a.name, b.name))
  }, [])
}

// -----------------------------------------------------------------------------
// Recherche de terrains (section 24)
// -----------------------------------------------------------------------------

export interface LandFilters {
  region?: string
  city?: string
  zoning?: LandZoning[]
  budgetMax?: number
  budgetMin?: number
  surfaceMin?: number
  surfaceMax?: number
  unitsMin?: number
  query?: string
  sort?: 'recent' | 'prix_asc' | 'prix_desc' | 'surface_desc'
  page?: number
  perPage?: number
}

export interface LandSearchResult {
  items: LandListingPublic[]
  total: number
  page: number
  perPage: number
}

export async function searchLands(
  filters: LandFilters = {},
  locale: Locale = DEFAULT_LOCALE,
): Promise<LandSearchResult> {
  const page = Math.max(1, filters.page ?? 1)
  const perPage = filters.perPage ?? 12
  const from = (page - 1) * perPage

  return safe(
    async () => {
      const supabase = await createSupabaseServerClient()
      let query = supabase
        .from('land_listings_public')
        .select('*', { count: 'exact' })
        .eq('status', 'publie')

      if (filters.region) query = query.eq('region_code', filters.region)
      if (filters.city) query = query.eq('city_id', filters.city)
      if (filters.zoning?.length) query = query.in('zoning', filters.zoning)
      if (filters.budgetMin) query = query.gte('total_price', filters.budgetMin)
      if (filters.budgetMax) query = query.lte('total_price', filters.budgetMax)
      if (filters.surfaceMin) query = query.gte('surface_m2', filters.surfaceMin)
      if (filters.surfaceMax) query = query.lte('surface_m2', filters.surfaceMax)
      if (filters.unitsMin) query = query.gte('estimated_units', filters.unitsMin)
      if (filters.query) {
        const term = `%${filters.query}%`
        query = query.or(
          `title.ilike.${term},description.ilike.${term},district.ilike.${term},city_name.ilike.${term}`,
        )
      }

      switch (filters.sort) {
        case 'prix_asc':
          query = query.order('total_price', { ascending: true, nullsFirst: false })
          break
        case 'prix_desc':
          query = query.order('total_price', { ascending: false, nullsFirst: false })
          break
        case 'surface_desc':
          query = query.order('surface_m2', { ascending: false })
          break
        default:
          query = query.order('published_at', { ascending: false, nullsFirst: false })
      }

      const { data, count } = await query.range(from, from + perPage - 1)
      return {
        items: ((data ?? []) as LandListingPublic[]).map((land) => localizeLand(land, locale)),
        total: count ?? 0,
        page,
        perPage,
      }
    },
    { items: [], total: 0, page, perPage },
  )
}

export async function getLand(
  id: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<LandListingPublic | null> {
  return safe(async () => {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.from('land_listings_public').select('*').eq('id', id).maybeSingle()
    return data ? localizeLand(data as LandListingPublic, locale) : null
  }, null)
}

export async function getLandImages(landId: string): Promise<{ id: string; storage_path: string; caption: string | null }[]> {
  return safe(async () => {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('land_images')
      .select('id, storage_path, caption')
      .eq('land_id', landId)
      .order('sort_order')
    return data ?? []
  }, [])
}

// -----------------------------------------------------------------------------
// Projets participatifs
// -----------------------------------------------------------------------------

export interface ProjectFilters {
  region?: string
  need?: PropertyNeed
  onlyOpen?: boolean
  page?: number
  perPage?: number
}

export async function listProjects(
  filters: ProjectFilters = {},
  locale: Locale = DEFAULT_LOCALE,
) {
  const page = Math.max(1, filters.page ?? 1)
  const perPage = filters.perPage ?? 12
  const from = (page - 1) * perPage

  return safe(
    async () => {
      const supabase = await createSupabaseServerClient()
      let query = supabase.from('projects_public').select('*', { count: 'exact' })

      query = filters.onlyOpen
        ? query.eq('status', 'ouvert')
        : query.in('status', ['ouvert', 'groupe_constitue', 'en_preparation', 'realise'])

      if (filters.region) query = query.eq('region_code', filters.region)
      if (filters.need) query = query.eq('property_need', filters.need)

      const { data, count } = await query
        .order('opened_at', { ascending: false, nullsFirst: false })
        .range(from, from + perPage - 1)

      return {
        items: ((data ?? []) as ProjectPublic[]).map((project) => localizeProject(project, locale)),
        total: count ?? 0,
        page,
        perPage,
      }
    },
    { items: [] as ProjectPublic[], total: 0, page, perPage },
  )
}

export async function getProject(
  id: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<ProjectPublic | null> {
  return safe(async () => {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.from('projects_public').select('*').eq('id', id).maybeSingle()
    return data ? localizeProject(data as ProjectPublic, locale) : null
  }, null)
}

// -----------------------------------------------------------------------------
// Chiffres affiches sur la page d'accueil
// -----------------------------------------------------------------------------

export interface PublicStats {
  lands: number
  projects: number
  regions: number
  units: number
}

/**
 * Chiffres de la page d'accueil.
 *
 * « Régions couvertes » compte les régions où un projet participatif existe
 * réellement, pas les 12 régions du référentiel : annoncer 12 quand aucun
 * projet n'est ouvert ailleurs serait trompeur. Le calcul vit dans la fonction
 * `public_stats()`, donc une seule requête et une seule définition.
 */
export async function getPublicStats(): Promise<PublicStats> {
  return safe(
    async () => {
      const supabase = await createSupabaseServerClient()
      const { data } = await supabase.rpc('public_stats')
      const row = ((data ?? []) as {
        lands: number
        projects: number
        regions_covered: number
        units: number
      }[])[0]

      return {
        lands: Number(row?.lands ?? 0),
        projects: Number(row?.projects ?? 0),
        regions: Number(row?.regions_covered ?? 0),
        units: Number(row?.units ?? 0),
      }
    },
    { lands: 0, projects: 0, regions: 0, units: 0 },
  )
}
