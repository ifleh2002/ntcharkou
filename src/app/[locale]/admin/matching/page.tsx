import type { Metadata } from 'next'
import Link from 'next/link'
import { rebuildMatches } from '@/app/actions/admin'
import { SegmentBar } from '@/components/charts'
import { ScoreBadge } from '@/components/score'
import { Badge, Button, Card, StatCard } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { CRITERION_WEIGHTS } from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { MatchStatus } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: `${getDictionary(resolveLocale(locale)).admin.matchingTitle} — Ntcharkou` }
}

interface RecentMatch {
  id: string
  score: number
  status: MatchStatus
  created_at: string
  land_id: string
  land_title: string
  land_city: string | null
  request_id: string
  request_title: string
  participant_name: string
}

interface MatchingKpis {
  total: number
  score_moyen: number
  excellents: number
  tres_bons: number
  interessants: number
  faibles: number
  notifies: number
  vus: number
  interesses: number
  convertis: number
  taux_ouverture: number
}

export default async function AdminMatchingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const tr = translation(resolveLocale(raw))
  const { t, f, path } = tr

  await requireAdmin()
  const supabase = await createSupabaseServerClient()

  const [kpisRes, recentRes] = await Promise.all([
    supabase.rpc('admin_matching_kpis'),
    supabase.rpc('admin_recent_matches', { p_limit: 60 }),
  ])

  const kpis = (kpisRes.data ?? {}) as Partial<MatchingKpis>
  const recent = (recentRes.data ?? []) as RecentMatch[]

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-encre-900">{t.admin.matchingTitle}</h1>
          <p className="mt-1 text-sm text-encre-500">
            {t.admin.matchingLead}
          </p>
        </div>
        <form action={rebuildMatches}>
          <Button type="submit" variant="secondary" size="sm">
            🔄 {t.admin.rebuild}
          </Button>
        </form>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.admin.kpiMatchesTotal} value={f.number(kpis.total ?? 0)} />
        <StatCard label={t.admin.averageScore} value={f.percent(kpis.score_moyen ?? 0, 1)} />
        <StatCard label={t.admin.kpiNotifications} value={f.number(kpis.notifies ?? 0)} />
        <StatCard
          label={t.admin.kpiOpenRate}
          value={f.percent(kpis.taux_ouverture ?? 0, 1)}
          hint={t.admin.kpiOpenRateHint}
          tone="zellige"
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <h2 className="mb-4 font-semibold text-encre-900">{t.admin.qualityBreakdown}</h2>
          <SegmentBar
            emptyLabel={t.admin.noMatch}
            segments={[
              { label: t.admin.qualityExcellent, value: kpis.excellents ?? 0, color: 'bg-emerald-600' },
              { label: t.admin.qualityGood, value: kpis.tres_bons ?? 0, color: 'bg-zellige-500' },
              { label: t.admin.qualityFair, value: kpis.interessants ?? 0, color: 'bg-safran-400' },
              { label: t.admin.qualityLow, value: kpis.faibles ?? 0, color: 'bg-sable-400' },
            ]}
          />
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              { label: t.admin.viewed, value: kpis.vus ?? 0 },
              { label: t.admin.interests, value: kpis.interesses ?? 0 },
              { label: t.admin.convertedShort, value: kpis.convertis ?? 0 },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-xs tracking-wide text-encre-400 uppercase">{item.label}</dt>
                <dd className="mt-1 text-xl font-bold text-encre-900">{f.number(item.value)}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-encre-900">{t.admin.weightsApplied}</h2>
          <ul className="space-y-2">
            {CRITERION_WEIGHTS.map((item) => (
              <li key={item.key} className="flex items-center gap-3 text-sm">
                <span className="w-32 text-encre-700">{t.enums.criterion[item.key]}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-sable-200">
                  <span
                    className="block h-full rounded-full bg-argile-400"
                    style={{ width: `${item.weight * 5}%` }}
                  />
                </span>
                <span className="w-10 text-end font-semibold text-encre-900">{item.weight} %</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-encre-400">
            {t.admin.thresholds}
          </p>
        </Card>
      </section>

      <section className="mt-6">
        <h2 className="mb-4 text-lg font-bold text-encre-900">{t.admin.latestMatches}</h2>
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-sable-300 bg-sable-100 text-start">
              <tr>
                <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colScore}</th>
                <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colLand}</th>
                <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colRequest}</th>
                <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colParticipant}</th>
                <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colStatus}</th>
                <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colCreatedOn}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sable-200">
              {recent.map((match) => (
                <tr key={match.id} className="hover:bg-sable-50">
                  <td className="px-4 py-3">
                    <ScoreBadge score={Number(match.score)} tr={tr} withLabel={false} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={path(`/terrains/${match.land_id}`)}
                      className="font-medium text-encre-900 hover:text-argile-600"
                    >
                      {match.land_title}
                    </Link>
                    {match.land_city ? (
                      <span className="block text-xs text-encre-400">{match.land_city}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-encre-700">{match.request_title}</td>
                  <td className="px-4 py-3 text-encre-700">{match.participant_name}</td>
                  <td className="px-4 py-3">
                    <Badge tone={match.status === 'interesse' ? 'zellige' : 'neutre'}>
                      {t.enums.matchStatus[match.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-encre-500">{f.date(match.created_at)}</td>
                </tr>
              ))}
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-encre-400">
                    {t.admin.noMatches}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  )
}
