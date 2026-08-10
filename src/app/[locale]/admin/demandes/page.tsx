import type { Metadata } from 'next'
import { Badge, Card } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { RequestStatus } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: `${getDictionary(resolveLocale(locale)).admin.requestsTitle} — Ntcharkou` }
}

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

export default async function AdminDemandesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const { t, f } = translation(resolveLocale(raw))

  await requireAdmin()
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase.rpc('admin_list_requests', { p_limit: 200 })
  const requests = (data ?? []) as Row[]

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-encre-900">{t.admin.requestsTitle}</h1>
        <p className="mt-1 text-sm text-encre-500">
          {requests.length} — {t.admin.requestsLead}
        </p>
      </header>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-sable-300 bg-sable-100 text-start">
            <tr>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colReference}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colRequest}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colParticipant}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colLocation}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colUnits}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colMaxBudget}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colMatches}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colStatus}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colPostedOnF}</th>
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
                  {[request.city_name, request.region_name].filter(Boolean).join(' — ') ||
                    t.common.indifferent}
                </td>
                <td className="px-4 py-3 text-encre-700">{request.units_wanted ?? '—'}</td>
                <td className="px-4 py-3 text-encre-700">
                  {f.dhCompact(request.budget_total_max)}
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
                    {t.enums.requestStatus[request.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-encre-500">{f.date(request.created_at)}</td>
              </tr>
            ))}
            {requests.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-encre-400">
                  {t.admin.noRequests}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
