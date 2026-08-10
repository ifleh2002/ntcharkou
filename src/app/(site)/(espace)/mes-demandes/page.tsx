import type { Metadata } from 'next'
import { Badge, Card, EmptyState, LinkButton, SectionTitle } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { formatDate, formatDhCompact } from '@/lib/format'
import { PROPERTY_NEED_LABELS, REQUEST_STATUS_LABELS } from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ParticipantRequest, RequestStatus } from '@/lib/types'

export const metadata: Metadata = { title: 'Mes demandes' }

const STATUS_TONES: Record<RequestStatus, 'succes' | 'neutre' | 'alerte'> = {
  brouillon: 'neutre',
  active: 'succes',
  en_pause: 'alerte',
  satisfaite: 'neutre',
  archivee: 'neutre',
}

export default async function MesDemandesPage() {
  const session = await requireSession('/mes-demandes')
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('participant_requests')
    .select('*')
    .eq('participant_id', session.userId)
    .order('created_at', { ascending: false })
    .returns<ParticipantRequest[]>()

  const requests = data ?? []

  // Nombre de correspondances par demande.
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
        title="Mes demandes"
        subtitle={`${requests.length} demande${requests.length > 1 ? 's' : ''}`}
        action={
          <LinkButton href="/mes-demandes/nouvelle" variant="collectif">
            Déposer une demande
          </LinkButton>
        }
      />

      {requests.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Aucune demande déposée"
          description="Décrivez ce que vous cherchez : typologie, budget, nombre d’unités. Le moteur vous préviendra dès qu’un terrain ou un projet correspondra."
          action={
            <LinkButton href="/mes-demandes/nouvelle" variant="collectif" size="sm" className="mt-2">
              Déposer ma première demande
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
                      {REQUEST_STATUS_LABELS[request.status]}
                    </Badge>
                    {request.reference ? <Badge>Réf. {request.reference}</Badge> : null}
                    {stats && stats.total > 0 ? (
                      <Badge tone="zellige">
                        🎯 {stats.total} correspondance{stats.total > 1 ? 's' : ''} · meilleur score{' '}
                        {Math.round(stats.best)} %
                      </Badge>
                    ) : null}
                  </div>

                  <h3 className="mt-2 font-semibold text-encre-900">{request.title}</h3>

                  <p className="mt-1 text-sm text-encre-500">
                    {request.property_needs
                      .slice(0, 3)
                      .map((need) => PROPERTY_NEED_LABELS[need])
                      .join(' · ')}
                    {request.property_needs.length > 3
                      ? ` +${request.property_needs.length - 3}`
                      : ''}
                  </p>

                  <p className="mt-1 text-sm text-encre-400">
                    {request.units_wanted ? `${request.units_wanted} unités · ` : ''}
                    {request.budget_total_max
                      ? `jusqu’à ${formatDhCompact(request.budget_total_max)} · `
                      : ''}
                    déposée le {formatDate(request.created_at)}
                  </p>
                </div>

                <LinkButton href={`/mes-demandes/${request.id}`} variant="secondary" size="sm">
                  Voir les correspondances
                </LinkButton>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
