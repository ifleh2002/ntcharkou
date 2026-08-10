import type { Metadata } from 'next'
import { BarList } from '@/components/charts'
import { Card, StatCard } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { formatDh, formatNumber, formatPercent, formatSurface } from '@/lib/format'
import { ZONING_LABELS } from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { LandZoning } from '@/lib/types'

export const metadata: Metadata = { title: 'Statistiques — Administration' }

interface LandKpis {
  prix_moyen_m2: number
  surface_moyenne: number
  pct_eau: number
  pct_electricite: number
  pct_assainissement: number
  par_zonage: Record<string, number>
}

interface ProjectKpis {
  projets_ouverts: number
  projets_complets: number
  projets_annules: number
  taux_abandon: number
  participants_moyen: number
  jours_pour_constituer: number
}

interface MatchingKpis {
  total: number
  score_moyen: number
  notifies: number
  vus: number
  interesses: number
  convertis: number
  taux_ouverture: number
}

export default async function AdminStatistiquesPage() {
  await requireAdmin()
  const supabase = await createSupabaseServerClient()

  const [landRes, projectRes, matchingRes, regionRes] = await Promise.all([
    supabase.rpc('admin_land_kpis'),
    supabase.rpc('admin_project_kpis'),
    supabase.rpc('admin_matching_kpis'),
    supabase.rpc('admin_lands_by_region'),
  ])

  const land = (landRes.data ?? {}) as Partial<LandKpis>
  const project = (projectRes.data ?? {}) as Partial<ProjectKpis>
  const matching = (matchingRes.data ?? {}) as Partial<MatchingKpis>

  const zoningData = Object.entries(land.par_zonage ?? {}).map(([key, value]) => ({
    label: ZONING_LABELS[key as LandZoning] ?? key,
    value: Number(value),
  }))

  const regionData = ((regionRes.data ?? []) as { region_name: string; total: number }[])
    .map((row) => ({ label: row.region_name, value: Number(row.total) }))
    .sort((a, b) => b.value - a.value)

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-encre-900">Statistiques et KPI métier</h1>
        <p className="mt-1 text-sm text-encre-500">
          Indicateurs de terrain, de matching et de constitution des groupes.
        </p>
      </header>

      {/* --- Terrains ---------------------------------------------------- */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-encre-900">Terrains</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Prix moyen / m²" value={formatDh(land.prix_moyen_m2 ?? 0)} />
          <StatCard label="Surface moyenne" value={formatSurface(land.surface_moyenne ?? 0)} />
          <StatCard label="% avec eau" value={formatPercent(land.pct_eau ?? 0, 1)} />
          <StatCard label="% avec électricité" value={formatPercent(land.pct_electricite ?? 0, 1)} />
          <StatCard
            label="% avec assainissement"
            value={formatPercent(land.pct_assainissement ?? 0, 1)}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="mb-4 font-semibold text-encre-900">Terrains par zonage</h3>
            <BarList data={zoningData} />
          </Card>
          <Card>
            <h3 className="mb-4 font-semibold text-encre-900">Terrains par région</h3>
            <BarList data={regionData} />
          </Card>
        </div>
      </section>

      {/* --- Matching ---------------------------------------------------- */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-encre-900">Matching</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Correspondances" value={formatNumber(matching.total ?? 0)} />
          <StatCard label="Score moyen" value={formatPercent(matching.score_moyen ?? 0, 1)} />
          <StatCard
            label="Clics après notification"
            value={formatPercent(matching.taux_ouverture ?? 0, 1)}
          />
          <StatCard label="Intérêts exprimés" value={formatNumber(matching.interesses ?? 0)} />
        </div>
      </section>

      {/* --- Projets ----------------------------------------------------- */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-encre-900">Projets participatifs</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Projets ouverts" value={formatNumber(project.projets_ouverts ?? 0)} />
          <StatCard label="Projets complets" value={formatNumber(project.projets_complets ?? 0)} />
          <StatCard
            label="Participants / projet"
            value={formatNumber(project.participants_moyen ?? 0)}
          />
          <StatCard
            label="Jours pour constituer"
            value={project.jours_pour_constituer ? `${project.jours_pour_constituer} j` : '—'}
          />
          <StatCard
            label="Taux d’abandon"
            value={formatPercent(project.taux_abandon ?? 0, 1)}
            tone="alerte"
          />
        </div>
      </section>
    </div>
  )
}
