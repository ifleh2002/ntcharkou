import type { Metadata } from 'next'
import { Badge, Card, EmptyState, LinkButton, SectionTitle } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ParticipantRequest, RequestStatus } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: getDictionary(resolveLocale(locale)).requests.title }
}

const STATUS_TONES: Record<RequestStatus, 'succes' | 'neutre' | 'alerte'> = {
  brouillon: 'neutre',
  active: 'succes',
  en_pause: 'alerte',
  satisfaite: 'neutre',
  archivee: 'neutre',
}

export default async function MesDemandesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const { t, f, path } = translation(locale)

  const session = await requireSession('/mes-demandes')
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('participant_requests')
    .select('*')
    .eq('participant_id', session.userId)
    .order('created_at', { ascending: false })
    .returns<ParticipantRequest[]>()

  const requests = data ?? []

  const { data: matchRows } = await supabase.from('matches').select('request_id, score')
  const counts = new Map<string, { total: number; best: number }>()
  for (const row of matchRows ?? []) {
    const entry = counts.get(row.request_id) ?? { total: 0, best: 0 }
    entry.total += 1
    entry.best = Math.max(entry.best, Number(row.score))
    counts.set(row.request_id, entry)
  }

  return (
    <div>
      <SectionTitle
        title={t.requests.title}
        subtitle={`${requests.length} ${t.requests.count}`}
        action={
          <LinkButton href={path('/mes-demandes/nouvelle')} variant="collectif">
            {t.requests.newRequest}
          </LinkButton>
        }
      />

      {requests.length === 0 ? (
        <EmptyState
          icon="📋"
          title={t.requests.emptyTitle}
          description={t.requests.emptyBody}
          action={
            <LinkButton
              href={path('/mes-demandes/nouvelle')}
              variant="collectif"
              size="sm"
              className="mt-2"
            >
              {t.requests.emptyCta}
            </LinkButton>
          }
        />
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const stats = counts.get(request.id)
            return (
              <Card key={request.id} className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={STATUS_TONES[request.status]}>
                      {t.enums.requestStatus[request.status]}
                    </Badge>
                    {request.reference ? (
                      <Badge>
                        {t.common.reference} <span className="ltr-inline">{request.reference}</span>
                      </Badge>
                    ) : null}
                    {stats && stats.total > 0 ? (
                      <Badge tone="zellige">
                        🎯 {stats.total} {t.requests.matchesBadge} {Math.round(stats.best)} %
                      </Badge>
                    ) : null}
                  </div>

                  <h3 className="mt-2 font-semibold text-encre-900">{request.title}</h3>

                  <p className="mt-1 text-sm text-encre-500">
                    {request.property_needs
                      .slice(0, 3)
                      .map((need) => t.enums.propertyNeed[need])
                      .join(' · ')}
                    {request.property_needs.length > 3
                      ? ` +${request.property_needs.length - 3}`
                      : ''}
                  </p>

                  <p className="mt-1 text-sm text-encre-400">
                    {request.units_wanted ? `${request.units_wanted} ${t.common.units} · ` : ''}
                    {request.budget_total_max
                      ? `${t.requests.upTo} ${f.dhCompact(request.budget_total_max)} · `
                      : ''}
                    {t.requests.postedOn} {f.date(request.created_at)}
                  </p>
                </div>

                <LinkButton
                  href={path(`/mes-demandes/${request.id}`)}
                  variant="secondary"
                  size="sm"
                >
                  {t.requests.seeMatches}
                </LinkButton>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
