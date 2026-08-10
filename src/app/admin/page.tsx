import type { Metadata } from 'next'
import Link from 'next/link'
import { BarList, LineChart, SegmentBar } from '@/components/charts'
import { Card, LinkButton, StatCard } from '@/components/ui'
import { formatNumber, formatPercent } from '@/lib/format'
import { PROPERTY_NEED_LABELS } from '@/lib/labels'
import { requireAdmin } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { PropertyNeed } from '@/lib/types'

export const metadata: Metadata = { title: 'Dashboard — Administration' }

interface Kpis {
  terrains: number
  terrains_en_attente: number
  terrains_total: number
  participants: number
  proprietaires: number
  demandes_actives: number
  projets_valides: number
  projets_en_attente: number
  groupes_constitues: number
  matchings: number
  matchings_pertinents: number
  score_moyen: number
  signalements_ouverts: number
  taux_conversion: number
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

const MONTH_LABELS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
]

export default async function AdminDashboardPage() {
  await requireAdmin()
  const supabase = await createSupabaseServerClient()

  const [kpisRes, signups, byRegion, byType, budgets, matchingRes] = await Promise.all([
    supabase.rpc('admin_kpis'),
    supabase.rpc('admin_signups_by_month', { months: 12 }),
    supabase.rpc('admin_lands_by_region'),
    supabase.rpc('admin_requests_by_type'),
    supabase.rpc('admin_budget_distribution'),
    supabase.rpc('admin_matching_kpis'),
  ])

  const kpis = (kpisRes.data ?? {}) as Partial<Kpis>
  const matching = (matchingRes.data ?? {}) as Partial<MatchingKpis>

  const signupPoints = (
    (signups.data ?? []) as { month: string; participants: number; proprietaires: number }[]
  ).map((row) => {
    const date = new Date(row.month)
    return {
      label: MONTH_LABELS[date.getUTCMonth()],
      values: [Number(row.participants), Number(row.proprietaires)],
    }
  })

  const regionData = ((byRegion.data ?? []) as { region_name: string; published: number }[])
    .map((row) => ({ label: row.region_name, value: Number(row.published) }))
    .sort((a, b) => b.value - a.value)

  const typeData = ((byType.data ?? []) as { property_need: PropertyNeed; total: number }[]).map(
    (row) => ({ label: PROPERTY_NEED_LABELS[row.property_need] ?? row.property_need, value: Number(row.total) }),
  )

  const budgetData = ((budgets.data ?? []) as { bucket: string; total: number }[]).map((row) => ({
    label: row.bucket,
    value: Number(row.total),
  }))

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-encre-900">Dashboard</h1>
          <p className="mt-1 text-sm text-encre-500">
            Vue d’ensemble de la plateforme : dépôts, demandes, matching et projets.
          </p>
        </div>
        {(kpis.terrains_en_attente ?? 0) > 0 ? (
          <LinkButton href="/admin/validations" size="sm">
            {kpis.terrains_en_attente} terrain{(kpis.terrains_en_attente ?? 0) > 1 ? 's' : ''} à
            valider
          </LinkButton>
        ) : null}
      </header>

      {/* --- KPI principaux (section 15) -------------------------------- */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Terrains publiés" value={formatNumber(kpis.terrains ?? 0)} />
        <StatCard
          label="Terrains en attente"
          value={formatNumber(kpis.terrains_en_attente ?? 0)}
          hint={(kpis.terrains_en_attente ?? 0) > 0 ? 'À traiter' : undefined}
          tone="alerte"
        />
        <StatCard label="Participants" value={formatNumber(kpis.participants ?? 0)} />
        <StatCard label="Demandes actives" value={formatNumber(kpis.demandes_actives ?? 0)} />
        <StatCard label="Projets validés" value={formatNumber(kpis.projets_valides ?? 0)} />
        <StatCard label="Groupes constitués" value={formatNumber(kpis.groupes_constitues ?? 0)} />
        <StatCard label="Matchings réalisés" value={formatNumber(kpis.matchings ?? 0)} />
        <StatCard
          label="Taux de conversion"
          value={formatPercent(kpis.taux_conversion ?? 0, 1)}
          hint="Correspondances suivies d’un intérêt"
          tone="zellige"
        />
      </section>

      {/* --- Graphiques (section 16) ------------------------------------ */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-encre-900">Évolution des inscriptions</h2>
          <p className="mb-4 text-sm text-encre-500">Sur les 12 derniers mois</p>
          <LineChart points={signupPoints} seriesLabels={['Participants', 'Propriétaires']} />
        </Card>

        <Card>
          <h2 className="font-semibold text-encre-900">Terrains par région</h2>
          <p className="mb-4 text-sm text-encre-500">Terrains publiés</p>
          <BarList data={regionData} />
        </Card>

        <Card>
          <h2 className="font-semibold text-encre-900">Demande par typologie</h2>
          <p className="mb-4 text-sm text-encre-500">Demandes actives</p>
          <BarList data={typeData} tone="zellige" />
        </Card>

        <Card>
          <h2 className="font-semibold text-encre-900">Distribution des budgets</h2>
          <p className="mb-4 text-sm text-encre-500">Enveloppe maximale déclarée</p>
          <BarList data={budgetData} tone="zellige" />
        </Card>
      </section>

      {/* --- Qualite du matching (section 17) --------------------------- */}
      <section className="mt-8">
        <Card>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-semibold text-encre-900">Qualité des correspondances</h2>
              <p className="text-sm text-encre-500">
                Score moyen : {formatPercent(matching.score_moyen ?? 0, 1)} · taux d’ouverture après
                notification : {formatPercent(matching.taux_ouverture ?? 0, 1)}
              </p>
            </div>
            <Link href="/admin/matching" className="text-sm font-semibold text-argile-600">
              Explorer le matching →
            </Link>
          </div>

          <SegmentBar
            segments={[
              { label: 'Excellent (≥ 90 %)', value: matching.excellents ?? 0, color: 'bg-emerald-600' },
              { label: 'Très bon (75 – 89 %)', value: matching.tres_bons ?? 0, color: 'bg-zellige-500' },
              { label: 'Intéressant (60 – 74 %)', value: matching.interessants ?? 0, color: 'bg-safran-400' },
              { label: 'Faible (< 60 %)', value: matching.faibles ?? 0, color: 'bg-sable-400' },
            ]}
          />

          <dl className="mt-5 grid gap-4 sm:grid-cols-4">
            {[
              { label: 'Notifiées', value: matching.notifies ?? 0 },
              { label: 'Consultées', value: matching.vus ?? 0 },
              { label: 'Intérêts exprimés', value: matching.interesses ?? 0 },
              { label: 'Converties en projet', value: matching.convertis ?? 0 },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-xs tracking-wide text-encre-400 uppercase">{item.label}</dt>
                <dd className="mt-1 text-xl font-bold text-encre-900">{formatNumber(item.value)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>
    </div>
  )
}
