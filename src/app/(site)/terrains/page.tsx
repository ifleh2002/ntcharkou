import type { Metadata } from 'next'
import Link from 'next/link'
import { LandCard } from '@/components/land-card'
import { LandFilters } from '@/components/land-filters'
import { EmptyState, LinkButton } from '@/components/ui'
import { formatNumber } from '@/lib/format'
import { getCities, getRegions, searchLands } from '@/lib/queries'
import type { LandZoning } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Terrains disponibles',
  description: 'Recherchez un terrain validé par région, ville, zonage, budget et surface.',
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
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const page = toNumber(first(params.page)) ?? 1
  const zoning = all(params.zonage) as LandZoning[]

  const filters = {
    q: first(params.q),
    region: first(params.region),
    city: first(params.city),
    zoning,
    budgetMin: toNumber(first(params.budget_min)),
    budgetMax: toNumber(first(params.budget_max)),
    surfaceMin: toNumber(first(params.surface_min)),
    surfaceMax: toNumber(first(params.surface_max)),
    unitsMin: toNumber(first(params.unites_min)),
    sort: (first(params.tri) ?? 'recent') as 'recent' | 'prix_asc' | 'prix_desc' | 'surface_desc',
    page,
  }

  const [regions, cities, results] = await Promise.all([
    getRegions(),
    getCities(),
    searchLands({ ...filters, query: filters.q }),
  ])

  const pageCount = Math.max(1, Math.ceil(results.total / results.perPage))

  const pageHref = (target: number) => {
    const next = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (key === 'page' || value === undefined) return
      all(value).forEach((v) => next.append(key, v))
    })
    next.set('page', String(target))
    return `/terrains?${next.toString()}`
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-encre-900">Terrains disponibles</h1>
        <p className="mt-2 text-encre-500">
          Tous les terrains affichés ici ont été vérifiés puis validés par l’administration. Les
          coordonnées du propriétaire restent masquées.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <LandFilters
            regions={regions}
            cities={cities}
            values={{
              q: filters.q,
              region: filters.region,
              city: filters.city,
              zoning,
              budgetMin: first(params.budget_min),
              budgetMax: first(params.budget_max),
              surfaceMin: first(params.surface_min),
              surfaceMax: first(params.surface_max),
              unitsMin: first(params.unites_min),
              sort: filters.sort,
            }}
          />
        </aside>

        <section>
          <p className="mb-4 text-sm font-medium text-encre-700">
            {results.total > 0
              ? `${formatNumber(results.total)} terrain${results.total > 1 ? 's' : ''} correspond${
                  results.total > 1 ? 'ent' : ''
                } à votre recherche`
              : 'Aucun terrain ne correspond à votre recherche'}
          </p>

          {results.items.length > 0 ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {results.items.map((land) => (
                  <LandCard key={land.id} land={land} />
                ))}
              </div>

              {pageCount > 1 ? (
                <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
                  {results.page > 1 ? (
                    <LinkButton href={pageHref(results.page - 1)} variant="secondary" size="sm">
                      ← Précédent
                    </LinkButton>
                  ) : null}
                  <span className="px-3 text-sm text-encre-500">
                    Page {results.page} sur {pageCount}
                  </span>
                  {results.page < pageCount ? (
                    <LinkButton href={pageHref(results.page + 1)} variant="secondary" size="sm">
                      Suivant →
                    </LinkButton>
                  ) : null}
                </nav>
              ) : null}
            </>
          ) : (
            <EmptyState
              icon="🔎"
              title="Aucun résultat"
              description="Élargissez vos critères, ou déposez une demande : vous serez prévenu dès qu’un terrain compatible sera publié."
              action={
                <div className="mt-2 flex gap-2">
                  <LinkButton href="/terrains" variant="secondary" size="sm">
                    Réinitialiser les filtres
                  </LinkButton>
                  <LinkButton href="/mes-demandes/nouvelle" size="sm">
                    Déposer une demande
                  </LinkButton>
                </div>
              }
            />
          )}

          <p className="mt-8 text-center text-sm text-encre-400">
            Vous possédez un terrain ?{' '}
            <Link href="/mes-terrains/nouveau" className="font-semibold text-argile-600">
              Proposez-le en quelques minutes
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
