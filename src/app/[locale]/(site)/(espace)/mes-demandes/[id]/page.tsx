import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { deleteRequest, setMatchStatus, setRequestStatus } from '@/app/actions/requests'
import { LandCard } from '@/components/land-card'
import { ScoreBadge, ScoreBreakdown } from '@/components/score'
import { Alert, Badge, Button, Card, EmptyState, LinkButton } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { LandListingPublic, Match, ParticipantRequest } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: getDictionary(resolveLocale(locale)).requests.detailTitle }
}

export default async function DemandeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale: raw, id } = await params
  const locale = resolveLocale(raw)
  const tr = translation(locale)
  const { t, f, path } = tr

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

  const criteria = [
    {
      label: t.requests.criteriaTypes,
      value: request.property_needs.map((need) => t.enums.propertyNeed[need]).join(', ') || '—',
    },
    { label: t.requests.criteriaUnits, value: request.units_wanted ?? t.common.unspecified },
    {
      label: t.requests.criteriaBudgetTotal,
      value:
        request.budget_total_min || request.budget_total_max
          ? `${f.dh(request.budget_total_min)} – ${f.dh(request.budget_total_max)}`
          : t.common.unspecified,
    },
    {
      label: t.requests.criteriaBudgetUnit,
      value:
        request.budget_per_unit_min || request.budget_per_unit_max
          ? `${f.dh(request.budget_per_unit_min)} – ${f.dh(request.budget_per_unit_max)}`
          : t.common.unspecified,
    },
    {
      label: t.requests.criteriaSurface,
      value:
        request.surface_min_m2 || request.surface_max_m2
          ? `${f.surface(request.surface_min_m2)} – ${f.surface(request.surface_max_m2)}`
          : t.common.unspecified,
    },
    {
      label: t.requests.criteriaGroup,
      value:
        request.same_body_preference === 'oui' && request.preferred_body
          ? `${t.common.yes} — ${t.enums.professionalBody[request.preferred_body]}`
          : t.enums.sameBody[request.same_body_preference],
    },
    {
      label: t.requests.criteriaNetworks,
      value:
        [
          request.requires_water && t.enums.network.waterShort,
          request.requires_electricity && t.enums.network.electricityShort,
          request.requires_sewage && t.enums.network.sewageShort,
        ]
          .filter(Boolean)
          .join(', ') || t.requests.noNetworkRequirement,
    },
  ]

  return (
    <div>
      <nav className="mb-5 text-sm text-encre-400">
        <Link href={path('/mes-demandes')} className="hover:text-zellige-600">
          {t.requests.title}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-encre-700">{request.title}</span>
      </nav>

      {query.creee ? (
        <div className="mb-5">
          <Alert tone="succes" title={t.requests.createdOk}>
            {matches.length > 0
              ? `${matches.length} ${
                  matches.length > 1 ? t.lands.countMany : t.lands.countOne
                } — ${t.requests.createdWithMatches}`
              : t.requests.createdNoMatch}
          </Alert>
        </div>
      ) : null}

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={request.status === 'active' ? 'succes' : 'neutre'}>
            {t.enums.requestStatus[request.status]}
          </Badge>
          {request.reference ? (
            <Badge>
              {t.common.reference} <span className="ltr-inline">{request.reference}</span>
            </Badge>
          ) : null}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-encre-900">{request.title}</h1>
        <p className="mt-1 text-sm text-encre-400">
          {t.requests.postedOn} {f.date(request.created_at)}
        </p>
      </header>

      <Card className="mb-8">
        <h2 className="font-semibold text-encre-900">{t.requests.criteria}</h2>
        <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {criteria.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 border-b border-sable-200 pb-2">
              <dt className="text-sm text-encre-500">{row.label}</dt>
              <dd className="text-end text-sm font-medium text-encre-900">{row.value}</dd>
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
              {request.status === 'active' ? t.requests.pause : t.requests.reactivate}
            </Button>
          </form>
          <form action={setRequestStatus}>
            <input type="hidden" name="request_id" value={request.id} />
            <input type="hidden" name="status" value="satisfaite" />
            <Button type="submit" variant="ghost" size="sm">
              {t.requests.markSatisfied}
            </Button>
          </form>
          <form action={deleteRequest}>
            <input type="hidden" name="request_id" value={request.id} />
            <Button type="submit" variant="danger" size="sm">
              {t.common.delete}
            </Button>
          </form>
        </div>
      </Card>

      <section>
        <h2 className="mb-1 text-xl font-bold text-encre-900">
          {t.requests.matchesTitle} ({matches.length})
        </h2>
        <p className="mb-5 text-sm text-encre-500">{t.requests.matchesLead}</p>

        {matches.length === 0 ? (
          <EmptyState
            icon="🎯"
            title={t.requests.noMatchTitle}
            description={t.requests.noMatchBody}
            action={
              <LinkButton href={path('/terrains')} variant="secondary" size="sm" className="mt-2">
                {t.requests.browseLands}
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
                      <LandCard land={land} tr={tr} score={match.score} />
                    </div>
                    <div className="border-t border-sable-200 p-5 lg:border-t-0 lg:border-s">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <ScoreBadge score={match.score} tr={tr} />
                        <Badge>{t.enums.matchStatus[match.status]}</Badge>
                      </div>

                      <div className="mt-4">
                        <ScoreBreakdown breakdown={match.breakdown} tr={tr} />
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <LinkButton href={path(`/terrains/${land.id}`)} size="sm">
                          {t.requests.seeLand}
                        </LinkButton>
                        <form action={setMatchStatus}>
                          <input type="hidden" name="match_id" value={match.id} />
                          <input type="hidden" name="request_id" value={request.id} />
                          <input type="hidden" name="status" value="interesse" />
                          <Button type="submit" variant="collectif" size="sm">
                            {t.requests.interested}
                          </Button>
                        </form>
                        <form action={setMatchStatus}>
                          <input type="hidden" name="match_id" value={match.id} />
                          <input type="hidden" name="request_id" value={request.id} />
                          <input type="hidden" name="status" value="refuse" />
                          <Button type="submit" variant="ghost" size="sm">
                            {t.requests.dismiss}
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
            {dismissed.length} {t.requests.dismissed}
          </p>
        ) : null}
      </section>
    </div>
  )
}
