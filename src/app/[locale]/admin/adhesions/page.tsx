import type { Metadata } from 'next'
import Link from 'next/link'
import { decideParticipation } from '@/app/actions/admin'
import { SchemaGapAlert } from '@/components/schema-gap-alert'
import { Alert, Badge, Button, Card, EmptyState } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { findSchemaGaps } from '@/lib/schema-check'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ProfessionalBody } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: `${getDictionary(resolveLocale(locale)).adminProjects.membershipTitle} — Ntcharkou` }
}

interface PendingRow {
  id: string
  project_id: string
  project_title: string
  project_ref: string | null
  units_planned: number
  units_reserved: number
  participant: string
  body: ProfessionalBody | null
  units_wanted: number
  message: string | null
  created_at: string
}

export default async function AdminAdhesionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const { t, f, path } = translation(locale)
  const query = await searchParams

  await requireAdmin()
  const supabase = await createSupabaseServerClient()

  const [{ data }, gaps] = await Promise.all([
    supabase.rpc('admin_pending_participations'),
    findSchemaGaps(),
  ])
  const pending = (data ?? []) as PendingRow[]

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-encre-900">{t.adminProjects.membershipTitle}</h1>
        <p className="mt-1 max-w-2xl text-sm text-encre-500">{t.adminProjects.membershipLead}</p>
      </header>

      <SchemaGapAlert gaps={gaps} t={t} />

      {typeof query.erreur === 'string' ? (
        <div className="mb-5">
          <Alert tone="danger" title={t.adminProjects.decisionFailed}>
            <span className="whitespace-pre-line">{query.erreur}</span>
          </Alert>
        </div>
      ) : null}

      {query.traite ? (
        <div className="mb-5">
          <Alert tone="succes">{t.adminProjects.decisionSaved}</Alert>
        </div>
      ) : null}

      {pending.length === 0 ? (
        <EmptyState
          icon="📭"
          title={t.adminProjects.noPendingTitle}
          description={t.adminProjects.noPendingBody}
        />
      ) : (
        <div className="space-y-4">
          {pending.map((row) => (
            <Card key={row.id} className="flex flex-wrap items-start gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {row.project_ref ? <Badge>{row.project_ref}</Badge> : null}
                  {row.body ? (
                    <Badge tone="argile">👥 {t.enums.professionalBody[row.body]}</Badge>
                  ) : null}
                  <Badge tone="neutre">
                    {row.units_wanted} {t.adminProjects.unitsWanted}
                  </Badge>
                </div>

                <h2 className="mt-2 font-semibold text-encre-900">
                  <Link href={path(`/projets/${row.project_id}`)} className="hover:text-argile-600">
                    {row.project_title}
                  </Link>
                </h2>
                {/* Unités restantes affichées avant la décision : accepter plus
                    d'unités qu'il n'en reste ne se rattrape pas silencieusement. */}
                <p className="mt-1 text-sm text-encre-500">
                  {row.participant} · {f.relative(row.created_at)}
                </p>
                <p className="mt-0.5 text-sm">
                  <span
                    className={
                      row.units_wanted > row.units_planned - row.units_reserved
                        ? 'font-semibold text-argile-600'
                        : 'text-encre-500'
                    }
                  >
                    {t.adminProjects.unitsLeft} :{' '}
                    {Math.max(0, row.units_planned - row.units_reserved)} / {row.units_planned}
                  </span>
                </p>
                {row.units_wanted > row.units_planned - row.units_reserved ? (
                  <p className="mt-1 text-sm font-semibold text-argile-600">
                    ⚠ {t.adminProjects.overCapacity}
                  </p>
                ) : null}
                {row.message ? (
                  <p className="mt-2 rounded-lg bg-sable-100 px-3 py-2 text-sm text-encre-700">
                    {row.message}
                  </p>
                ) : null}
              </div>

              {/* Accepter ou refuser déclenche la notification du candidat côté
                  base : la décision et l'information partent ensemble. */}
              <div className="flex shrink-0 flex-wrap gap-2">
                <form action={decideParticipation}>
                  <input type="hidden" name="participation_id" value={row.id} />
                  <input type="hidden" name="accept" value="1" />
                  <Button type="submit" variant="collectif" size="sm">
                    {t.adminProjects.accept}
                  </Button>
                </form>
                <form action={decideParticipation}>
                  <input type="hidden" name="participation_id" value={row.id} />
                  <input type="hidden" name="accept" value="0" />
                  <Button type="submit" variant="secondary" size="sm">
                    {t.adminProjects.reject}
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
