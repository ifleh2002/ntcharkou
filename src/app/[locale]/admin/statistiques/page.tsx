import type { Metadata } from 'next'
import { BarList } from '@/components/charts'
import { Card, StatCard } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { LandZoning } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: `${getDictionary(resolveLocale(locale)).admin.statsTitle} — Ntcharkou` }
}

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

export default async function AdminStatistiquesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const { t, f } = translation(locale)

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
    label: t.enums.zoning[key as LandZoning] ?? key,
    value: Number(value),
  }))

  const regionData = ((regionRes.data ?? []) as { region_name: string; total: number }[])
    .map((row) => ({ label: row.region_name, value: Number(row.total) }))
    .sort((a, b) => b.value - a.value)

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-encre-900">{t.admin.statsTitle}</h1>
        <p className="mt-1 text-sm text-encre-500">
          {t.admin.statsLead}
        </p>
      </header>

      {/* --- Terrains ---------------------------------------------------- */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-encre-900">{t.admin.statsLands}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label={t.admin.avgPricePerM2} value={f.dh(land.prix_moyen_m2 ?? 0)} />
          <StatCard label={t.admin.avgSurface} value={f.surface(land.surface_moyenne ?? 0)} />
          <StatCard label={t.admin.pctWater} value={f.percent(land.pct_eau ?? 0, 1)} />
          <StatCard label={t.admin.pctElectricity} value={f.percent(land.pct_electricite ?? 0, 1)} />
          <StatCard
            label={t.admin.pctSewage}
            value={f.percent(land.pct_assainissement ?? 0, 1)}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="mb-4 font-semibold text-encre-900">{t.admin.landsByZoning}</h3>
            <BarList data={zoningData} emptyLabel={t.admin.noData} />
          </Card>
          <Card>
            <h3 className="mb-4 font-semibold text-encre-900">{t.admin.landsByRegion}</h3>
            <BarList data={regionData} emptyLabel={t.admin.noData} />
          </Card>
        </div>
      </section>

      {/* --- Matching ---------------------------------------------------- */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-encre-900">{t.admin.statsMatching}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t.admin.kpiMatchesTotal} value={f.number(matching.total ?? 0)} />
          <StatCard label={t.admin.averageScore} value={f.percent(matching.score_moyen ?? 0, 1)} />
          <StatCard
            label={t.admin.clicksAfterNotification}
            value={f.percent(matching.taux_ouverture ?? 0, 1)}
          />
          <StatCard label={t.admin.interests} value={f.number(matching.interesses ?? 0)} />
        </div>
      </section>

      {/* --- Projets ----------------------------------------------------- */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-encre-900">{t.admin.statsProjects}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label={t.admin.openProjects} value={f.number(project.projets_ouverts ?? 0)} />
          <StatCard label={t.admin.completeProjects} value={f.number(project.projets_complets ?? 0)} />
          <StatCard
            label={t.admin.participantsPerProject}
            value={f.number(project.participants_moyen ?? 0)}
          />
          <StatCard
            label={t.admin.daysToForm}
            value={project.jours_pour_constituer ? f.number(project.jours_pour_constituer) : '—'}
          />
          <StatCard
            label={t.admin.dropoutRate}
            value={f.percent(project.taux_abandon ?? 0, 1)}
            tone="alerte"
          />
        </div>
      </section>
    </div>
  )
}
