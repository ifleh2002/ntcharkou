import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { deleteRequest, setMatchStatus, setRequestStatus } from '@/app/actions/requests'
import { LandCard } from '@/components/land-card'
import { ScoreBadge, ScoreBreakdown } from '@/components/score'
import { Alert, Badge, Button, Card, EmptyState, LinkButton } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { formatDate, formatDh, formatSurface } from '@/lib/format'
import {
  MATCH_STATUS_LABELS,
  PROFESSIONAL_BODY_LABELS,
  PROPERTY_NEED_LABELS,
  REQUEST_STATUS_LABELS,
  SAME_BODY_LABELS,
} from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { LandListingPublic, Match, ParticipantRequest } from '@/lib/types'

export const metadata: Metadata = { title: 'Détail de ma demande' }

export default async function DemandeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const query = await searchParams
  const session = await requireSession(`/mes-demandes/${id}`)
  const supabase = await createSupabaseServerClient()

  const { data: request } = await supabase
    .from('participant_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle<ParticipantRequest>()

  if (!request || request.participant_id !== session.userId) notFound()

  const { data: matchRows } = await supabase
    .from('matches')
    .select('*')
    .eq('request_id', id)
    .order('score', { ascending: false })
    .returns<Match[]>()

  const matches = (matchRows ?? []).filter((match) => match.status !== 'refuse')
  const dismissed = (matchRows ?? []).filter((match) => match.status === 'refuse')

  let lands: LandListingPublic[] = []
  if (matches.length > 0) {
    const { data } = await supabase
      .from('land_listings_public')
      .select('*')
      .in(
        'id',
        matches.map((match) => match.land_id),
      )
    lands = (data ?? []) as LandListingPublic[]
  }

  return (
    <div>
      <nav className="mb-5 text-sm text-encre-400">
        <Link href="/mes-demandes" className="hover:text-zellige-600">
          Mes demandes
        </Link>
        <span className="mx-2">/</span>
        <span className="text-encre-700">{request.title}</span>
      </nav>

      {query.creee ? (
        <div className="mb-5">
          <Alert tone="succes" title="Demande enregistrée">
            {matches.length > 0
              ? `${matches.length} terrain${matches.length > 1 ? 's' : ''} déjà publié${
                  matches.length > 1 ? 's' : ''
                } correspond${matches.length > 1 ? 'ent' : ''} à votre demande — ils sont listés ci-dessous.`
              : 'Aucun terrain publié ne correspond pour le moment. Vous serez notifié dès qu’un terrain compatible sera publié.'}
          </Alert>
        </div>
      ) : null}

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={request.status === 'active' ? 'succes' : 'neutre'}>
            {REQUEST_STATUS_LABELS[request.status]}
          </Badge>
          {request.reference ? <Badge>Réf. {request.reference}</Badge> : null}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-encre-900">{request.title}</h1>
        <p className="mt-1 text-sm text-encre-400">Déposée le {formatDate(request.created_at)}</p>
      </header>

      {/* --- Rappel des criteres ---------------------------------------- */}
      <Card className="mb-8">
        <h2 className="font-semibold text-encre-900">Vos critères</h2>
        <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {[
            {
              label: 'Typologies recherchées',
              value: request.property_needs.map((need) => PROPERTY_NEED_LABELS[need]).join(', ') || '—',
            },
            { label: 'Nombre d’unités', value: request.units_wanted ?? 'Non précisé' },
            {
              label: 'Budget total',
              value:
                request.budget_total_min || request.budget_total_max
                  ? `${formatDh(request.budget_total_min)} – ${formatDh(request.budget_total_max)}`
                  : 'Non précisé',
            },
            {
              label: 'Budget par unité',
              value:
                request.budget_per_unit_min || request.budget_per_unit_max
                  ? `${formatDh(request.budget_per_unit_min)} – ${formatDh(request.budget_per_unit_max)}`
                  : 'Non précisé',
            },
            {
              label: 'Surface souhaitée',
              value:
                request.surface_min_m2 || request.surface_max_m2
                  ? `${formatSurface(request.surface_min_m2)} – ${formatSurface(request.surface_max_m2)}`
                  : 'Non précisée',
            },
            {
              label: 'Groupe professionnel',
              value:
                request.same_body_preference === 'oui' && request.preferred_body
                  ? `Oui — ${PROFESSIONAL_BODY_LABELS[request.preferred_body]}`
                  : SAME_BODY_LABELS[request.same_body_preference],
            },
            {
              label: 'Réseaux indispensables',
              value:
                [
                  request.requires_water && 'Eau',
                  request.requires_electricity && 'Électricité',
                  request.requires_sewage && 'Assainissement',
                ]
                  .filter(Boolean)
                  .join(', ') || 'Aucun impératif',
            },
          ].map((row) => (
            <div key={row.label} className="flex justify-between gap-4 border-b border-sable-200 pb-2">
              <dt className="text-sm text-encre-500">{row.label}</dt>
              <dd className="text-right text-sm font-medium text-encre-900">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          <form action={setRequestStatus}>
            <input type="hidden" name="request_id" value={request.id} />
            <input
              type="hidden"
              name="status"
              value={request.status === 'active' ? 'en_pause' : 'active'}
            />
            <Button type="submit" variant="secondary" size="sm">
              {request.status === 'active' ? 'Mettre en pause' : 'Réactiver la demande'}
            </Button>
          </form>
          <form action={setRequestStatus}>
            <input type="hidden" name="request_id" value={request.id} />
            <input type="hidden" name="status" value="satisfaite" />
            <Button type="submit" variant="ghost" size="sm">
              Marquer comme satisfaite
            </Button>
          </form>
          <form action={deleteRequest}>
            <input type="hidden" name="request_id" value={request.id} />
            <Button type="submit" variant="danger" size="sm">
              Supprimer
            </Button>
          </form>
        </div>
      </Card>

      {/* --- Correspondances --------------------------------------------- */}
      <section>
        <h2 className="mb-1 text-xl font-bold text-encre-900">
          Terrains correspondants ({matches.length})
        </h2>
        <p className="mb-5 text-sm text-encre-500">
          Le score détaille la pondération appliquée : région 20 %, ville 15 %, type 20 %, zonage
          15 %, budget 15 %, unités 10 %, réseaux 5 %.
        </p>

        {matches.length === 0 ? (
          <EmptyState
            icon="🎯"
            title="Aucune correspondance pour l’instant"
            description="Votre demande reste active : chaque nouveau terrain publié lui sera confronté automatiquement, et vous serez notifié dès qu’un score dépasse 60 %."
            action={
              <LinkButton href="/terrains" variant="secondary" size="sm" className="mt-2">
                Parcourir les terrains
              </LinkButton>
            }
          />
        ) : (
          <div className="space-y-5">
            {matches.map((match) => {
              const land = lands.find((item) => item.id === match.land_id)
              if (!land) return null
              return (
                <Card key={match.id} className="p-0">
                  <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
                    <div className="p-4">
                      <LandCard land={land} score={match.score} />
                    </div>
                    <div className="border-t border-sable-200 p-5 lg:border-t-0 lg:border-l">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <ScoreBadge score={match.score} />
                        <Badge>{MATCH_STATUS_LABELS[match.status]}</Badge>
                      </div>

                      <div className="mt-4">
                        <ScoreBreakdown breakdown={match.breakdown} />
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <LinkButton href={`/terrains/${land.id}`} size="sm">
                          Voir le terrain
                        </LinkButton>
                        <form action={setMatchStatus}>
                          <input type="hidden" name="match_id" value={match.id} />
                          <input type="hidden" name="request_id" value={request.id} />
                          <input type="hidden" name="status" value="interesse" />
                          <Button type="submit" variant="collectif" size="sm">
                            Je suis intéressé
                          </Button>
                        </form>
                        <form action={setMatchStatus}>
                          <input type="hidden" name="match_id" value={match.id} />
                          <input type="hidden" name="request_id" value={request.id} />
                          <input type="hidden" name="status" value="refuse" />
                          <Button type="submit" variant="ghost" size="sm">
                            Écarter
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {dismissed.length > 0 ? (
          <p className="mt-6 text-sm text-encre-400">
            {dismissed.length} correspondance{dismissed.length > 1 ? 's' : ''} écartée
            {dismissed.length > 1 ? 's' : ''}.
          </p>
        ) : null}
      </section>
    </div>
  )
}
