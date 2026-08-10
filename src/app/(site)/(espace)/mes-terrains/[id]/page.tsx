import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { archiveLand, deleteLand, submitLand } from '@/app/actions/lands'
import { Alert, Badge, Button, Card, LinkButton, StatCard } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { formatDate, formatDh, formatPercent, formatSurface } from '@/lib/format'
import { LISTING_STATUS_LABELS, LISTING_WORKFLOW, ZONING_LABELS } from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ListingStatus, LandZoning } from '@/lib/types'

export const metadata: Metadata = { title: 'Gérer mon terrain' }

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
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
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

  if (!land || land.status === undefined) notFound()

  const [documents, images, summary] = await Promise.all([
    supabase.from('land_documents').select('id, kind, label, created_at').eq('land_id', id),
    supabase.from('land_images').select('id', { count: 'exact', head: true }).eq('land_id', id),
    supabase.rpc('owner_land_demand_summary', { p_land: id }).maybeSingle<DemandSummary>(),
  ])

  const currentStep = LISTING_WORKFLOW.indexOf(land.status)
  const demand = summary.data

  return (
    <div>
      <nav className="mb-5 text-sm text-encre-400">
        <Link href="/mes-terrains" className="hover:text-argile-600">
          Mes terrains
        </Link>
        <span className="mx-2">/</span>
        <span className="text-encre-700">{land.title}</span>
      </nav>

      {query.cree ? (
        <div className="mb-5">
          <Alert tone="succes" title="Terrain enregistré">
            {land.status === 'soumis'
              ? 'Votre annonce a été soumise à l’administration. Vous serez notifié dès sa validation.'
              : 'Votre brouillon est enregistré. Soumettez-le lorsque votre dossier est complet.'}
          </Alert>
        </div>
      ) : null}

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={land.status === 'publie' ? 'succes' : 'alerte'}>
            {LISTING_STATUS_LABELS[land.status]}
          </Badge>
          <Badge tone="argile">{ZONING_LABELS[land.zoning]}</Badge>
          {land.reference ? <Badge>Réf. {land.reference}</Badge> : null}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-encre-900">{land.title}</h1>
        <p className="mt-1 text-sm text-encre-500">
          {formatSurface(land.surface_m2)} ·{' '}
          {land.price_per_m2 ? `${formatDh(land.price_per_m2)}/m²` : 'prix non renseigné'} ·{' '}
          {formatDh(land.total_price)}
        </p>
      </header>

      {land.status === 'refuse' && land.rejection_reason ? (
        <div className="mb-6">
          <Alert tone="danger" title="Annonce refusée">
            {land.rejection_reason}
          </Alert>
        </div>
      ) : null}

      {/* --- Workflow ---------------------------------------------------- */}
      <Card className="mb-6">
        <h2 className="font-semibold text-encre-900">Suivi de validation</h2>
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
                {index + 1}. {LISTING_STATUS_LABELS[status]}
              </li>
            )
          })}
        </ol>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-encre-400">Créé le</dt>
            <dd className="font-medium text-encre-900">{formatDate(land.created_at)}</dd>
          </div>
          <div>
            <dt className="text-encre-400">Soumis le</dt>
            <dd className="font-medium text-encre-900">{formatDate(land.submitted_at)}</dd>
          </div>
          <div>
            <dt className="text-encre-400">Publié le</dt>
            <dd className="font-medium text-encre-900">{formatDate(land.published_at)}</dd>
          </div>
        </dl>
      </Card>

      {/* --- Interet suscite (anonymise) -------------------------------- */}
      {land.status === 'publie' ? (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-bold text-encre-900">Intérêt suscité</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label="Consultations" value={land.view_count} />
            <StatCard label="Demandes compatibles" value={demand?.match_count ?? 0} />
            <StatCard
              label="Score moyen"
              value={demand?.average_score != null ? formatPercent(demand.average_score, 1) : '—'}
            />
            <StatCard label="Unités recherchées" value={demand?.total_units_wanted ?? 0} />
          </div>
          <p className="mt-3 text-xs text-encre-400">
            L’identité des participants intéressés n’est pas communiquée. L’administration organise la
            mise en relation lorsque le projet se concrétise.
          </p>
        </section>
      ) : null}

      {/* --- Pieces jointes --------------------------------------------- */}
      <Card className="mb-6">
        <h2 className="font-semibold text-encre-900">Pièces du dossier</h2>
        <p className="mt-1 text-sm text-encre-500">
          {images.count ?? 0} photo{(images.count ?? 0) > 1 ? 's' : ''} publiée
          {(images.count ?? 0) > 1 ? 's' : ''} · {documents.data?.length ?? 0} document
          {(documents.data?.length ?? 0) > 1 ? 's' : ''} privé
          {(documents.data?.length ?? 0) > 1 ? 's' : ''}
        </p>
        {documents.data && documents.data.length > 0 ? (
          <ul className="mt-3 space-y-1.5 text-sm">
            {documents.data.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2 text-encre-700">
                <span aria-hidden>🔒</span>
                <span>{doc.label ?? doc.kind}</span>
                <span className="text-xs text-encre-400">— {formatDate(doc.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-encre-400">
            Aucun document joint. Un dossier complet (titre foncier, note de renseignement
            urbanistique, plan) accélère la validation.
          </p>
        )}
      </Card>

      {/* --- Actions ----------------------------------------------------- */}
      <Card>
        <h2 className="font-semibold text-encre-900">Actions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {land.status === 'publie' ? (
            <LinkButton href={`/terrains/${land.id}`} variant="secondary" size="sm">
              Voir la fiche publique
            </LinkButton>
          ) : null}

          {['brouillon', 'refuse'].includes(land.status) ? (
            <form action={submitLand}>
              <input type="hidden" name="land_id" value={land.id} />
              <Button type="submit" size="sm">
                Soumettre pour validation
              </Button>
            </form>
          ) : null}

          {['brouillon', 'refuse', 'publie'].includes(land.status) ? (
            <form action={archiveLand}>
              <input type="hidden" name="land_id" value={land.id} />
              <Button type="submit" variant="secondary" size="sm">
                Retirer l’annonce
              </Button>
            </form>
          ) : null}

          {['brouillon', 'refuse'].includes(land.status) ? (
            <form action={deleteLand}>
              <input type="hidden" name="land_id" value={land.id} />
              <Button type="submit" variant="danger" size="sm">
                Supprimer définitivement
              </Button>
            </form>
          ) : null}
        </div>
        {land.status === 'en_verification' ? (
          <p className="mt-3 text-sm text-encre-400">
            Votre dossier est en cours de vérification : il n’est pas modifiable pendant cette phase.
          </p>
        ) : null}
      </Card>

      <p className="mt-6 text-xs text-encre-400">
        Propriétaire : {session.profile.first_name} {session.profile.last_name} — vos coordonnées ne
        sont visibles que par vous et par l’administration.
      </p>
    </div>
  )
}
