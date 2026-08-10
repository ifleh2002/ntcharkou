import type { Metadata } from 'next'
import Link from 'next/link'
import { LandCard } from '@/components/land-card'
import { LandFilters } from '@/components/land-filters'
import { EmptyState, LinkButton } from '@/components/ui'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { getCities, getRegions, searchLands } from '@/lib/queries'
import type { LandZoning } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = getDictionary(resolveLocale(locale))
  return { title: t.lands.searchTitle, description: t.lands.searchLead }
}

type SearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value || undefined
}

function all(value: string | string[] | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export default async function TerrainsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<SearchParams>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const tr = translation(locale)
  const { t, f, path } = tr

  const query = await searchParams
  const page = toNumber(first(query.page)) ?? 1
  const zoning = all(query.zonage) as LandZoning[]

  const filters = {
    q: first(query.q),
    region: first(query.region),
    city: first(query.city),
    zoning,
    budgetMin: toNumber(first(query.budget_min)),
    budgetMax: toNumber(first(query.budget_max)),
    surfaceMin: toNumber(first(query.surface_min)),
    surfaceMax: toNumber(first(query.surface_max)),
    unitsMin: toNumber(first(query.unites_min)),
    sort: (first(query.tri) ?? 'recent') as 'recent' | 'prix_asc' | 'prix_desc' | 'surface_desc',
    page,
  }

  const [regions, cities, results] = await Promise.all([
    getRegions(locale),
    getCities(locale),
    searchLands({ ...filters, query: filters.q }, locale),
  ])

  const pageCount = Math.max(1, Math.ceil(results.total / results.perPage))

  const pageHref = (target: number) => {
    const next = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (key === 'page' || value === undefined) return
      all(value).forEach((v) => next.append(key, v))
    })
    next.set('page', String(target))
    return path(`/terrains?${next.toString()}`)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-encre-900">{t.lands.searchTitle}</h1>
        <p className="mt-2 text-encre-500">{t.lands.searchLead}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <LandFilters
            regions={regions}
            cities={cities}
            t={t}
            resetHref={path('/terrains')}
            values={{
              q: filters.q,
              region: filters.region,
              city: filters.city,
              zoning,
              budgetMin: first(query.budget_min),
              budgetMax: first(query.budget_max),
              surfaceMin: first(query.surface_min),
              surfaceMax: first(query.surface_max),
              unitsMin: first(query.unites_min),
              sort: filters.sort,
            }}
          />
        </aside>

        <section>
          <p className="mb-4 text-sm font-medium text-encre-700">
            {results.total > 0
              ? `${f.number(results.total)} ${
                  results.total > 1 ? t.lands.countMany : t.lands.countOne
                }`
              : t.lands.countNone}
          </p>

          {results.items.length > 0 ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {results.items.map((land) => (
                  <LandCard key={land.id} land={land} tr={tr} />
                ))}
              </div>

              {pageCount > 1 ? (
                <nav className="mt-8 flex items-center justify-center gap-2">
                  {results.page > 1 ? (
                    <LinkButton href={pageHref(results.page - 1)} variant="secondary" size="sm">
                      ← {t.common.previous}
                    </LinkButton>
                  ) : null}
                  <span className="px-3 text-sm text-encre-500">
                    {t.common.page} {results.page} {t.common.of} {pageCount}
                  </span>
                  {results.page < pageCount ? (
                    <LinkButton href={pageHref(results.page + 1)} variant="secondary" size="sm">
                      {t.common.next} →
                    </LinkButton>
                  ) : null}
                </nav>
              ) : null}
            </>
          ) : (
            <EmptyState
              icon="🔎"
              title={t.lands.emptyTitle}
              description={t.lands.emptyBody}
              action={
                <div className="mt-2 flex gap-2">
                  <LinkButton href={path('/terrains')} variant="secondary" size="sm">
                    {t.lands.resetFilters}
                  </LinkButton>
                  <LinkButton href={path('/mes-demandes/nouvelle')} size="sm">
                    {t.requests.newRequest}
                  </LinkButton>
                </div>
              }
            />
          )}

          <p className="mt-8 text-center text-sm text-encre-400">
            {t.lands.ownLandPrompt}{' '}
            <Link href={path('/mes-terrains/nouveau')} className="font-semibold text-argile-600">
              {t.lands.ownLandCta}
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
