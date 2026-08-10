import type { Metadata } from 'next'
import Link from 'next/link'
import { resolveReport } from '@/app/actions/admin'
import { Badge, Button, Card, EmptyState } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import { REPORT_REASON_LABELS } from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ReportReason } from '@/lib/types'

export const metadata: Metadata = { title: 'Signalements — Administration' }

interface Row {
  id: string
  reason: ReportReason
  details: string | null
  land_id: string | null
  project_id: string | null
  resolved_at: string | null
  created_at: string
}

export default async function AdminSignalementsPage() {
  await requireAdmin()
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('reports')
    .select('id, reason, details, land_id, project_id, resolved_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
    .returns<Row[]>()

  const reports = data ?? []
  const open = reports.filter((r) => !r.resolved_at)
  const closed = reports.filter((r) => r.resolved_at)

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-encre-900">Signalements</h1>
        <p className="mt-1 text-sm text-encre-500">
          {open.length} signalement{open.length > 1 ? 's' : ''} en attente de traitement
        </p>
      </header>

      {open.length === 0 ? (
        <EmptyState icon="✅" title="Aucun signalement en attente" />
      ) : (
        <div className="space-y-3">
          {open.map((report) => (
            <Card key={report.id} className="flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="danger">{REPORT_REASON_LABELS[report.reason]}</Badge>
                  <span className="text-xs text-encre-400">{formatDate(report.created_at)}</span>
                </div>
                {report.details ? (
                  <p className="mt-2 text-sm text-encre-700">{report.details}</p>
                ) : null}
                {report.land_id ? (
                  <Link
                    href={`/terrains/${report.land_id}`}
                    className="mt-2 inline-block text-sm font-semibold text-argile-600"
                  >
                    Consulter le terrain signalé →
                  </Link>
                ) : null}
                {report.project_id ? (
                  <Link
                    href={`/projets/${report.project_id}`}
                    className="mt-2 inline-block text-sm font-semibold text-zellige-600"
                  >
                    Consulter le projet signalé →
                  </Link>
                ) : null}
              </div>

              <form action={resolveReport}>
                <input type="hidden" name="report_id" value={report.id} />
                <Button type="submit" variant="secondary" size="sm">
                  Marquer comme traité
                </Button>
              </form>
            </Card>
          ))}
        </div>
      )}

      {closed.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-encre-900">
            Signalements traités ({closed.length})
          </h2>
          <Card className="p-0">
            <ul className="divide-y divide-sable-200">
              {closed.map((report) => (
                <li key={report.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <Badge>{REPORT_REASON_LABELS[report.reason]}</Badge>
                  <span className="flex-1 truncate text-encre-500">{report.details ?? '—'}</span>
                  <span className="text-xs text-encre-400">
                    traité le {formatDate(report.resolved_at)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </div>
  )
}
