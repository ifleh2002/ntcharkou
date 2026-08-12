import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { archiveLand, deleteLand, submitLand } from '@/app/actions/lands'
import { Alert, Badge, Button, Card, LinkButton, StatCard } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { ParcelEditor } from '@/components/parcel-editor'
import { getDictionary } from '@/lib/i18n'
import type { GeoPolygon } from '@/lib/map'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { LISTING_WORKFLOW } from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { LandZoning, ListingStatus } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: getDictionary(resolveLocale(locale)).myLands.manageTitle }
}

interface LandRow {
  id: string
  reference: string | null
  title: string
  status: ListingStatus
  zoning: LandZoning
  surface_m2: number
  price_per_m2: number | null
  total_price: number | null
  created_at: string
  submitted_at: string | null
  published_at: string | null
  view_count: number
  rejection_reason: string | null
  region_code: string
  district: string | null
}

interface DemandSummary {
  match_count: number
  average_score: number | null
  best_score: number | null
  total_units_wanted: number
}

export default async function GererTerrainPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale: raw, id } = await params
  const locale = resolveLocale(raw)
  const { t, f, path } = translation(locale)

  const query = await searchParams
  const session = await requireSession(`/mes-terrains/${id}`)
  const supabase = await createSupabaseServerClient()

  const { data: land } = await supabase
    .from('land_listings')
    .select(
      'id, reference, title, status, zoning, surface_m2, price_per_m2, total_price, created_at, submitted_at, published_at, view_count, rejection_reason, region_code, district',
    )
    .eq('id', id)
    .maybeSingle<LandRow>()

  if (!land) notFound()

  // La géométrie vient de la vue : la table la stocke en WKB, que le navigateur
  // ne sait pas lire. La vue la publie en GeoJSON, directement exploitable.
  const { data: geo } = await supabase
    .from('land_listings_public')
    .select('parcel, map_lat, map_lng')
    .eq('id', id)
    .maybeSingle<{ parcel: GeoPolygon | null; map_lat: number | null; map_lng: number | null }>()

  const [documents, images, summary] = await Promise.all([
    supabase.from('land_documents').select('id, kind, label, created_at').eq('land_id', id),
    supabase.from('land_images').select('id', { count: 'exact', head: true }).eq('land_id', id),
    supabase.rpc('owner_land_demand_summary', { p_land: id }).maybeSingle<DemandSummary>(),
  ])

  const currentStep = LISTING_WORKFLOW.indexOf(land.status)
  const demand = summary.data
  const documentCount = documents.data?.length ?? 0

  return (
    <div>
      <nav className="mb-5 text-sm text-encre-400">
        <Link href={path('/mes-terrains')} className="hover:text-argile-600">
          {t.myLands.title}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-encre-700">{land.title}</span>
      </nav>

      {query.cree ? (
        <div className="mb-5">
          <Alert tone="succes" title={t.myLands.createdOk}>
            {land.status === 'soumis' ? t.myLands.createdSubmitted : t.myLands.createdDraft}
          </Alert>
        </div>
      ) : null}

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={land.status === 'publie' ? 'succes' : 'alerte'}>
            {t.enums.listingStatus[land.status]}
          </Badge>
          <Badge tone="argile">{t.enums.zoning[land.zoning]}</Badge>
          {land.reference ? (
            <Badge>
              {t.common.reference} <span className="ltr-inline">{land.reference}</span>
            </Badge>
          ) : null}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-encre-900">{land.title}</h1>
        <p className="mt-1 text-sm text-encre-500">
          {f.surface(land.surface_m2)} ·{' '}
          {land.price_per_m2 ? `${f.dh(land.price_per_m2)}/${f.sqm}` : t.common.priceNotProvided} ·{' '}
          {f.dh(land.total_price)}
        </p>
      </header>

      {land.status === 'refuse' && land.rejection_reason ? (
        <div className="mb-6">
          <Alert tone="danger" title={t.myLands.rejected}>
            {land.rejection_reason}
          </Alert>
        </div>
      ) : null}

      <Card className="mb-6">
        <h2 className="font-semibold text-encre-900">{t.myLands.validationTracking}</h2>
        <ol className="mt-3 flex flex-wrap gap-2">
          {LISTING_WORKFLOW.map((status, index) => {
            const done = currentStep >= 0 && index <= currentStep
            return (
              <li
                key={status}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  done
                    ? 'border-argile-200 bg-argile-100 text-argile-800'
                    : 'border-sable-300 bg-sable-100 text-encre-400'
                }`}
              >
                {index + 1}. {t.enums.listingStatus[status]}
              </li>
            )
          })}
        </ol>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-encre-400">{t.common.createdOn}</dt>
            <dd className="font-medium text-encre-900">{f.date(land.created_at)}</dd>
          </div>
          <div>
            <dt className="text-encre-400">{t.common.submittedOn}</dt>
            <dd className="font-medium text-encre-900">{f.date(land.submitted_at)}</dd>
          </div>
          <div>
            <dt className="text-encre-400">{t.common.publishedOn}</dt>
            <dd className="font-medium text-encre-900">{f.date(land.published_at)}</dd>
          </div>
        </dl>
      </Card>

      {land.status === 'publie' ? (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-bold text-encre-900">{t.myLands.interestTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label={t.myLands.statViews} value={land.view_count} />
            <StatCard label={t.myLands.statMatches} value={demand?.match_count ?? 0} />
            <StatCard
              label={t.myLands.statAverage}
              value={demand?.average_score != null ? f.percent(demand.average_score, 1) : '—'}
            />
            <StatCard label={t.myLands.statUnitsWanted} value={demand?.total_units_wanted ?? 0} />
          </div>
          <p className="mt-3 text-xs text-encre-400">{t.myLands.interestNote}</p>
        </section>
      ) : null}

      <Card className="mb-6">
        <h2 className="font-semibold text-encre-900">{t.myLands.filesTitle}</h2>
        <p className="mt-1 text-sm text-encre-500">
          {images.count ?? 0} {t.myLands.filesPhotos} · {documentCount} {t.myLands.filesDocuments}
        </p>
        {documentCount > 0 ? (
          <ul className="mt-3 space-y-1.5 text-sm">
            {documents.data?.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2 text-encre-700">
                <span aria-hidden>🔒</span>
                <span>{doc.label ?? doc.kind}</span>
                <span className="text-xs text-encre-400">— {f.date(doc.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-encre-400">{t.myLands.filesEmpty}</p>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold text-encre-900">{t.myLands.actions}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {land.status === 'publie' ? (
            <LinkButton href={path(`/terrains/${land.id}`)} variant="secondary" size="sm">
              {t.myLands.seePublic}
            </LinkButton>
          ) : null}

          {['brouillon', 'refuse'].includes(land.status) ? (
            <form action={submitLand}>
              <input type="hidden" name="land_id" value={land.id} />
              <Button type="submit" size="sm">
                {t.myLands.submitForReview}
              </Button>
            </form>
          ) : null}

          {['brouillon', 'refuse', 'publie'].includes(land.status) ? (
            <form action={archiveLand}>
              <input type="hidden" name="land_id" value={land.id} />
              <Button type="submit" variant="secondary" size="sm">
                {t.myLands.withdraw}
              </Button>
            </form>
          ) : null}

          {['brouillon', 'refuse'].includes(land.status) ? (
            <form action={deleteLand}>
              <input type="hidden" name="land_id" value={land.id} />
              <Button type="submit" variant="danger" size="sm">
                {t.myLands.deleteForever}
              </Button>
            </form>
          ) : null}
        </div>
        {land.status === 'en_verification' ? (
          <p className="mt-3 text-sm text-encre-400">{t.myLands.lockedNote}</p>
        ) : null}
      </Card>

      <p className="mt-6 text-xs text-encre-400">
        {session.profile.first_name} {session.profile.last_name} — {t.myLands.ownerNote}
      </p>
      {/* Tracé de la parcelle : c'est le propriétaire qui connaît ses limites. */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-encre-900">{t.map.drawTitle}</h2>
        <Card>
          <ParcelEditor
            landId={land.id}
            initial={geo?.parcel ?? null}
            center={
              geo?.map_lat != null && geo?.map_lng != null ? [geo.map_lat, geo.map_lng] : null
            }
            t={t}
          />
        </Card>
      </section>

    </div>
  )
}
