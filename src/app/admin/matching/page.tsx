import type { Metadata } from 'next'
import Link from 'next/link'
import { rebuildMatches } from '@/app/actions/admin'
import { SegmentBar } from '@/components/charts'
import { ScoreBadge } from '@/components/score'
import { Badge, Button, Card, StatCard } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { formatDate, formatNumber, formatPercent } from '@/lib/format'
import { CRITERION_LABELS, MATCH_STATUS_LABELS } from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { MatchStatus } from '@/lib/types'

export const metadata: Metadata = { title: 'Matching — Administration' }

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

const WEIGHTS = [
  { key: 'region', weight: 20 },
  { key: 'ville', weight: 15 },
  { key: 'type', weight: 20 },
  { key: 'zonage', weight: 15 },
  { key: 'budget', weight: 15 },
  { key: 'unites', weight: 10 },
  { key: 'reseaux', weight: 5 },
]

export default async function AdminMatchingPage() {
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
          <h1 className="text-2xl font-bold text-encre-900">Matching</h1>
          <p className="mt-1 text-sm text-encre-500">
            Le calcul s’exécute dans la base, à chaque publication de terrain et à chaque dépôt de
            demande.
          </p>
        </div>
        <form action={rebuildMatches}>
          <Button type="submit" variant="secondary" size="sm">
            🔄 Recalculer toutes les correspondances
          </Button>
        </form>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Correspondances" value={formatNumber(kpis.total ?? 0)} />
        <StatCard label="Score moyen" value={formatPercent(kpis.score_moyen ?? 0, 1)} />
        <StatCard label="Notifications envoyées" value={formatNumber(kpis.notifies ?? 0)} />
        <StatCard
          label="Taux d’ouverture"
          value={formatPercent(kpis.taux_ouverture ?? 0, 1)}
          hint="Clics après notification"
          tone="zellige"
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <h2 className="mb-4 font-semibold text-encre-900">Répartition par qualité</h2>
          <SegmentBar
            segments={[
              { label: 'Excellent (≥ 90 %)', value: kpis.excellents ?? 0, color: 'bg-emerald-600' },
              { label: 'Très bon (75 – 89 %)', value: kpis.tres_bons ?? 0, color: 'bg-zellige-500' },
              { label: 'Intéressant (60 – 74 %)', value: kpis.interessants ?? 0, color: 'bg-safran-400' },
              { label: 'Faible (< 60 %)', value: kpis.faibles ?? 0, color: 'bg-sable-400' },
            ]}
          />
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Consultées', value: kpis.vus ?? 0 },
              { label: 'Intérêts exprimés', value: kpis.interesses ?? 0 },
              { label: 'Converties', value: kpis.convertis ?? 0 },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-xs tracking-wide text-encre-400 uppercase">{item.label}</dt>
                <dd className="mt-1 text-xl font-bold text-encre-900">{formatNumber(item.value)}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-encre-900">Pondération appliquée</h2>
          <ul className="space-y-2">
            {WEIGHTS.map((item) => (
              <li key={item.key} className="flex items-center gap-3 text-sm">
                <span className="w-32 text-encre-700">{CRITERION_LABELS[item.key]}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-sable-200">
                  <span
                    className="block h-full rounded-full bg-argile-400"
                    style={{ width: `${item.weight * 5}%` }}
                  />
                </span>
                <span className="w-10 text-right font-semibold text-encre-900">{item.weight} %</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-encre-400">
            Seuils : correspondance enregistrée à partir de 40 %, notification envoyée à partir de
            60 %.
          </p>
        </Card>
      </section>

      <section className="mt-6">
        <h2 className="mb-4 text-lg font-bold text-encre-900">Dernières correspondances</h2>
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-sable-300 bg-sable-100 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-encre-700">Score</th>
                <th className="px-4 py-3 font-semibold text-encre-700">Terrain</th>
                <th className="px-4 py-3 font-semibold text-encre-700">Demande</th>
                <th className="px-4 py-3 font-semibold text-encre-700">Participant</th>
                <th className="px-4 py-3 font-semibold text-encre-700">Statut</th>
                <th className="px-4 py-3 font-semibold text-encre-700">Créée le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sable-200">
              {recent.map((match) => (
                <tr key={match.id} className="hover:bg-sable-50">
                  <td className="px-4 py-3">
                    <ScoreBadge score={Number(match.score)} withLabel={false} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/terrains/${match.land_id}`}
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
                      {MATCH_STATUS_LABELS[match.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-encre-500">{formatDate(match.created_at)}</td>
                </tr>
              ))}
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-encre-400">
                    Aucune correspondance calculée pour le moment.
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
