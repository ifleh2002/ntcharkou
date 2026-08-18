import { DEFAULT_LOCALE, type Locale } from './i18n/config'
import type { RegionActivity } from '@/components/activity-map'
import { normalizeCounters } from './project-counters'
import { createSupabaseServerClient, isSupabaseConfigured } from './supabase/server'
import type {
  BlogCategory,
  BlogPost,
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

/**
 * Contenu rédigé par un utilisateur : on affiche la graphie de la langue en
 * cours, et le français sert de repli. Une annonce sans traduction reste ainsi
 * lisible en arabe plutôt que d'apparaître vide.
 */
function pickText(locale: Locale, fr: string | null, ar: string | null): string | null {
  // Une traduction ne contenant que des espaces doit compter comme absente,
  // sinon elle l'emporte sur le français et le champ s'affiche vide. La vue
  // applique deja `nullif(btrim(...), '')`, mais l'application ne doit pas en
  // dependre : elle lit aussi des lignes ecrites ailleurs.
  const blank = (value: string | null) => !value || value.trim() === ''
  const first = locale === 'ar' ? ar : fr
  const fallback = locale === 'ar' ? fr : ar

  if (!blank(first)) return first
  if (!blank(fallback)) return fallback
  return null
}

function localizeLand(land: LandListingPublic, locale: Locale): LandListingPublic {
  return {
    ...land,
    region_name: pickName(locale, land.region_name, land.region_name_ar),
    city_name: land.city_name || land.city_name_ar
      ? pickName(locale, land.city_name, land.city_name_ar)
      : null,
    title: pickText(locale, land.title, land.title_ar) ?? land.title,
    description: pickText(locale, land.description, land.description_ar),
    observations: pickText(locale, land.observations, land.observations_ar),
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
    title: pickText(locale, project.title, project.title_ar) ?? project.title,
    summary: pickText(locale, project.summary, project.summary_ar),
    description: pickText(locale, project.description, project.description_ar),
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

/**
 * Activité par région, pour la carte d'accueil : terrains proposés et projets
 * ouverts, comptés séparément car ils ne disent pas la même chose.
 *
 * Le décompte passe par une fonction SECURITY DEFINER : un visiteur anonyme ne
 * « voit » pas toutes les lignes à travers la RLS, un comptage direct
 * sous-estimerait donc les totaux.
 */
export async function getRegionActivity(): Promise<RegionActivity[]> {
  return safe(async () => {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.rpc('region_activity')
    return ((data ?? []) as RegionActivity[]).map((region) => ({
      ...region,
      latitude: Number(region.latitude),
      longitude: Number(region.longitude),
      lands: Number(region.lands),
      projects: Number(region.projects),
    }))
  }, [])
}

// -----------------------------------------------------------------------------
// Blog
// -----------------------------------------------------------------------------

/** Colonnes de la vue publique des articles. */
const POST_COLUMNS =
  'id, slug, title, title_ar, excerpt, excerpt_ar, body, body_ar, category, ' +
  'cover_image_path, status, reading_minutes, view_count, published_at, ' +
  'created_at, author_name'

/**
 * Résout la graphie d'un article selon la langue en cours.
 *
 * Même règle que partout ailleurs : l'arabe s'il existe, le français en repli.
 * Un article sans traduction reste lisible plutôt que de s'afficher vide.
 */
function localizePost(post: BlogPost, locale: Locale): BlogPost {
  return {
    ...post,
    title: pickText(locale, post.title, post.title_ar) ?? post.title,
    excerpt: pickText(locale, post.excerpt, post.excerpt_ar),
    body: pickText(locale, post.body, post.body_ar) ?? post.body,
  }
}

/**
 * Articles publiés, du plus récent au plus ancien.
 *
 * On trie sur `published_at` et non sur `created_at` : un brouillon rédigé il y
 * a trois semaines et publié ce matin doit apparaître en tête, sans quoi il
 * naîtrait enterré.
 */
export async function listPosts(
  options: { category?: BlogCategory; limit?: number } = {},
  locale: Locale = DEFAULT_LOCALE,
): Promise<BlogPost[]> {
  return safe(async () => {
    const supabase = await createSupabaseServerClient()
    let query = supabase
      .from('blog_posts_public')
      .select(POST_COLUMNS)
      .eq('status', 'publie')
      .order('published_at', { ascending: false, nullsFirst: false })

    if (options.category) query = query.eq('category', options.category)

    const { data } = await query.limit(options.limit ?? 30)
    return ((data ?? []) as unknown as BlogPost[]).map((post) => localizePost(post, locale))
  }, [])
}

/** Un article par son adresse publique. Absent ou non publié : `null`. */
export async function getPost(
  slug: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<BlogPost | null> {
  return safe(async () => {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('blog_posts_public')
      .select(POST_COLUMNS)
      .eq('slug', slug)
      .eq('status', 'publie')
      .maybeSingle()

    return data ? localizePost(data as unknown as BlogPost, locale) : null
  }, null)
}

/**
 * Nombre d'articles publiés par rubrique.
 *
 * Sert à n'afficher dans le filtre que des rubriques qui mènent quelque part :
 * proposer « Financement » pour arriver sur une page vide n'apprend rien.
 */
export async function countPostsByCategory(): Promise<Record<string, number>> {
  return safe(async () => {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('blog_posts_public')
      .select('category')
      .eq('status', 'publie')

    const counts: Record<string, number> = {}
    for (const row of (data ?? []) as { category: string }[]) {
      counts[row.category] = (counts[row.category] ?? 0) + 1
    }
    return counts
  }, {})
}

/**
 * Articles voisins d'un article donné : même rubrique d'abord.
 *
 * Un article de fond se lit rarement seul — proposer la suite évite de renvoyer
 * le lecteur à la liste complète.
 */
export async function listRelatedPosts(
  post: BlogPost,
  locale: Locale = DEFAULT_LOCALE,
  limit = 3,
): Promise<BlogPost[]> {
  const sameCategory = (await listPosts({ category: post.category, limit: limit + 1 }, locale))
    .filter((item) => item.id !== post.id)

  if (sameCategory.length >= limit) return sameCategory.slice(0, limit)

  // Rubrique peu fournie : on complète avec les plus récents, sans doublon.
  const recent = (await listPosts({ limit: limit + sameCategory.length + 1 }, locale)).filter(
    (item) => item.id !== post.id && !sameCategory.some((kept) => kept.id === item.id),
  )

  return [...sameCategory, ...recent].slice(0, limit)
}

/**
 * Tous les articles, brouillons compris — back-office uniquement.
 *
 * La RLS laisse passer les brouillons pour l'administration seule ; un
 * participant qui atteindrait cette requête ne verrait que les articles
 * publiés. La lecture se fait sur la table et non sur la vue, pour disposer des
 * colonnes de rédaction telles qu'elles ont été saisies : le back-office édite
 * les deux langues, il ne doit donc pas recevoir la version « résolue ».
 */
export async function listAllPosts(): Promise<BlogPost[]> {
  return safe(async () => {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('blog_posts')
      .select(
        'id, slug, title, title_ar, excerpt, excerpt_ar, body, body_ar, category, ' +
          'cover_image_path, status, reading_minutes, view_count, published_at, created_at',
      )
      .order('created_at', { ascending: false })

    if (error) throw error
    return ((data ?? []) as unknown as BlogPost[]).map((post) => ({ ...post, author_name: null }))
  }, [])
}

/** Un article par son identifiant, pour l'écran de modification. */
export async function getPostById(id: string): Promise<BlogPost | null> {
  return safe(async () => {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('blog_posts')
      .select(
        'id, slug, title, title_ar, excerpt, excerpt_ar, body, body_ar, category, ' +
          'cover_image_path, status, reading_minutes, view_count, published_at, created_at',
      )
      .eq('id', id)
      .maybeSingle()

    return data ? ({ ...(data as unknown as BlogPost), author_name: null }) : null
  }, null)
}
