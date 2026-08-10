import { createSupabaseServerClient, isSupabaseConfigured } from './supabase/server'
import type {
  City,
  LandListingPublic,
  LandZoning,
  ProjectPublic,
  PropertyNeed,
  Region,
} from './types'

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

export async function getRegions(): Promise<Region[]> {
  return safe(async () => {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.from('regions').select('*').order('sort_order')
    return (data ?? []) as Region[]
  }, [])
}

export async function getCities(regionCode?: string | null): Promise<City[]> {
  return safe(async () => {
    const supabase = await createSupabaseServerClient()
    let query = supabase.from('cities').select('*').order('name_fr')
    if (regionCode) query = query.eq('region_code', regionCode)
    const { data } = await query
    return (data ?? []) as City[]
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

export async function searchLands(filters: LandFilters = {}): Promise<LandSearchResult> {
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
        items: (data ?? []) as LandListingPublic[],
        total: count ?? 0,
        page,
        perPage,
      }
    },
    { items: [], total: 0, page, perPage },
  )
}

export async function getLand(id: string): Promise<LandListingPublic | null> {
  return safe(async () => {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.from('land_listings_public').select('*').eq('id', id).maybeSingle()
    return (data as LandListingPublic | null) ?? null
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

export async function listProjects(filters: ProjectFilters = {}) {
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

      return { items: (data ?? []) as ProjectPublic[], total: count ?? 0, page, perPage }
    },
    { items: [] as ProjectPublic[], total: 0, page, perPage },
  )
}

export async function getProject(id: string): Promise<ProjectPublic | null> {
  return safe(async () => {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.from('projects_public').select('*').eq('id', id).maybeSingle()
    return (data as ProjectPublic | null) ?? null
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

export async function getPublicStats(): Promise<PublicStats> {
  return safe(
    async () => {
      const supabase = await createSupabaseServerClient()
      const [lands, projects, regions] = await Promise.all([
        supabase
          .from('land_listings_public')
          .select('estimated_units', { count: 'exact' })
          .eq('status', 'publie'),
        supabase
          .from('projects_public')
          .select('id', { count: 'exact', head: true })
          .in('status', ['ouvert', 'groupe_constitue', 'en_preparation', 'realise']),
        supabase.from('regions').select('code', { count: 'exact', head: true }),
      ])

      const units = (lands.data ?? []).reduce(
        (sum, row) => sum + ((row as { estimated_units: number | null }).estimated_units ?? 0),
        0,
      )

      return {
        lands: lands.count ?? 0,
        projects: projects.count ?? 0,
        regions: regions.count ?? 0,
        units,
      }
    },
    { lands: 0, projects: 0, regions: 0, units: 0 },
  )
}
