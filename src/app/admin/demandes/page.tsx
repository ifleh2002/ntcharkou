import type { Metadata } from 'next'
import { Badge, Card } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { formatDate, formatDhCompact } from '@/lib/format'
import { REQUEST_STATUS_LABELS } from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { RequestStatus } from '@/lib/types'

export const metadata: Metadata = { title: 'Demandes — Administration' }

interface Row {
  id: string
  reference: string | null
  title: string
  status: RequestStatus
  created_at: string
  units_wanted: number | null
  budget_total_max: number | null
  region_name: string | null
  city_name: string | null
  participant_name: string
  match_count: number
}

export default async function AdminDemandesPage() {
  await requireAdmin()
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase.rpc('admin_list_requests', { p_limit: 200 })
  const requests = (data ?? []) as Row[]

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-encre-900">Demandes des participants</h1>
        <p className="mt-1 text-sm text-encre-500">
          {requests.length} demandes · les coordonnées restent consultables uniquement depuis la
          fiche utilisateur.
        </p>
      </header>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-sable-300 bg-sable-100 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-encre-700">Référence</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Demande</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Participant</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Localisation</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Unités</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Budget max</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Correspondances</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Statut</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Déposée le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sable-200">
            {requests.map((request) => (
              <tr key={request.id} className="hover:bg-sable-50">
                <td className="px-4 py-3 font-mono text-xs text-encre-500">
                  {request.reference ?? '—'}
                </td>
                <td className="px-4 py-3 font-medium text-encre-900">{request.title}</td>
                <td className="px-4 py-3 text-encre-700">{request.participant_name}</td>
                <td className="px-4 py-3 text-encre-700">
                  {[request.city_name, request.region_name].filter(Boolean).join(' — ') || 'Indifférent'}
                </td>
                <td className="px-4 py-3 text-encre-700">{request.units_wanted ?? '—'}</td>
                <td className="px-4 py-3 text-encre-700">
                  {formatDhCompact(request.budget_total_max)}
                </td>
                <td className="px-4 py-3">
                  {request.match_count > 0 ? (
                    <Badge tone="zellige">🎯 {request.match_count}</Badge>
                  ) : (
                    <span className="text-encre-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={request.status === 'active' ? 'succes' : 'neutre'}>
                    {REQUEST_STATUS_LABELS[request.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-encre-500">{formatDate(request.created_at)}</td>
              </tr>
            ))}
            {requests.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-encre-400">
                  Aucune demande enregistrée.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
