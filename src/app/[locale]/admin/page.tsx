import type { Metadata } from 'next'
import Link from 'next/link'
import { ActionQueue, CompletenessPanel, type CompletenessRow, type QueueRow } from '@/components/admin-queue'
import { BarList, LineChart, SegmentBar } from '@/components/charts'
import { Card, LinkButton, StatCard } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { listAllPosts } from '@/lib/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { PropertyNeed } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: `${getDictionary(resolveLocale(locale)).admin.dashboardTitle} — Ntcharkou` }
}

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

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const { t, f, path } = translation(locale)

  await requireAdmin()
  const supabase = await createSupabaseServerClient()

  // Ce qui attend une décision, et ce qui est publié mais incomplet.
  const [queue, completeness] = await Promise.all([
    supabase.rpc('admin_action_queue'),
    supabase.rpc('admin_completeness'),
  ])
  const queueRows = (queue.data ?? []) as QueueRow[]
  const completenessRows = (completeness.data ?? []) as CompletenessRow[]

  // État du blog : ce qui est en ligne, ce qui attend d'être publié, et ce qui
  // est lu. Un brouillon oublié ne se signale nulle part ailleurs.
  const posts = await listAllPosts()
  const published = posts.filter((post) => post.status === 'publie')
  const drafts = posts.length - published.length
  const mostRead = [...published].sort((a, b) => b.view_count - a.view_count)[0] ?? null

  // Mois abrégés dans la langue courante.
  const monthFormat = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : 'fr-MA', {
    month: 'short',
  })

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
      label: monthFormat.format(date),
      values: [Number(row.participants), Number(row.proprietaires)],
    }
  })

  const regionData = ((byRegion.data ?? []) as { region_name: string; published: number }[])
    .map((row) => ({ label: row.region_name, value: Number(row.published) }))
    .sort((a, b) => b.value - a.value)

  const typeData = ((byType.data ?? []) as { property_need: PropertyNeed; total: number }[]).map(
    (row) => ({
      label: t.enums.propertyNeed[row.property_need] ?? row.property_need,
      value: Number(row.total),
    }),
  )

  const budgetData = ((budgets.data ?? []) as { bucket: string; total: number }[]).map((row) => ({
    label: row.bucket,
    value: Number(row.total),
  }))

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ActionQueue rows={queueRows} t={t} path={path} />
        <CompletenessPanel rows={completenessRows} t={t} path={path} />
      </div>

        <div>
          <h1 className="text-2xl font-bold text-encre-900">{t.admin.dashboardTitle}</h1>
          <p className="mt-1 text-sm text-encre-500">
            {t.admin.dashboardLead}
          </p>
        </div>
        {(kpis.terrains_en_attente ?? 0) > 0 ? (
          <LinkButton href={path('/admin/validations')} size="sm">
            {kpis.terrains_en_attente} {t.admin.navLands.toLowerCase()} — {t.admin.toValidate}
          </LinkButton>
        ) : null}
      </header>

      {/* --- KPI principaux (section 15) -------------------------------- */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.admin.kpiLands} value={f.number(kpis.terrains ?? 0)} />
        <StatCard
          label={t.admin.kpiPending}
          value={f.number(kpis.terrains_en_attente ?? 0)}
          hint={(kpis.terrains_en_attente ?? 0) > 0 ? t.admin.kpiPendingHint : undefined}
          tone="alerte"
        />
        <StatCard label={t.admin.kpiParticipants} value={f.number(kpis.participants ?? 0)} />
        <StatCard label={t.admin.kpiActiveRequests} value={f.number(kpis.demandes_actives ?? 0)} />
        <StatCard label={t.admin.kpiValidProjects} value={f.number(kpis.projets_valides ?? 0)} />
        <StatCard label={t.admin.kpiGroups} value={f.number(kpis.groupes_constitues ?? 0)} />
        <StatCard label={t.admin.kpiMatches} value={f.number(kpis.matchings ?? 0)} />
        <StatCard
          label={t.admin.kpiConversion}
          value={f.percent(kpis.taux_conversion ?? 0, 1)}
          hint={t.admin.kpiConversionHint}
          tone="zellige"
        />
      </section>

      {/* --- Graphiques (section 16) ------------------------------------ */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-encre-900">{t.admin.chartSignups}</h2>
          <p className="mb-4 text-sm text-encre-500">{t.admin.chartSignupsSub}</p>
          <LineChart
            points={signupPoints}
            seriesLabels={[t.admin.seriesParticipants, t.admin.seriesOwners]}
            emptyLabel={t.admin.noData}
          />
        </Card>

        <Card>
          <h2 className="font-semibold text-encre-900">{t.admin.chartRegions}</h2>
          <p className="mb-4 text-sm text-encre-500">{t.admin.chartRegionsSub}</p>
          <BarList data={regionData} emptyLabel={t.admin.noData} />
        </Card>

        <Card>
          <h2 className="font-semibold text-encre-900">{t.admin.chartTypes}</h2>
          <p className="mb-4 text-sm text-encre-500">{t.admin.chartTypesSub}</p>
          <BarList data={typeData} tone="zellige" emptyLabel={t.admin.noData} />
        </Card>

        <Card>
          <h2 className="font-semibold text-encre-900">{t.admin.chartBudgets}</h2>
          <p className="mb-4 text-sm text-encre-500">{t.admin.chartBudgetsSub}</p>
          <BarList data={budgetData} tone="zellige" emptyLabel={t.admin.noData} />
        </Card>
      </section>

      {/* --- Qualite du matching (section 17) --------------------------- */}
      <section className="mt-8">
        <Card>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-semibold text-encre-900">{t.adminBlog.title}</h2>
              <p className="text-sm text-encre-500">
                {published.length} {t.adminBlog.statusPublished.toLowerCase()} · {drafts}{' '}
                {t.adminBlog.statusDraft.toLowerCase()}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={path('/admin/blog')} className="text-sm font-semibold text-argile-600">
                {t.adminBlog.listTitle}
              </Link>
              <LinkButton href={path('/admin/blog/nouveau')} size="sm">
                {t.adminBlog.create}
              </LinkButton>
            </div>
          </div>

          {mostRead ? (
            <p className="text-sm text-encre-600">
              🥇{' '}
              <Link
                href={path(`/admin/blog/${mostRead.id}`)}
                className="font-semibold hover:underline"
              >
                {mostRead.title}
              </Link>{' '}
              — {f.number(mostRead.view_count)} {t.blog.views}
            </p>
          ) : (
            <p className="text-sm text-encre-400">{t.adminBlog.emptyBody}</p>
          )}
        </Card>
      </section>

      <section className="mt-8">
        <Card>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-semibold text-encre-900">{t.admin.matchQuality}</h2>
              <p className="text-sm text-encre-500">
                {t.admin.averageScore} : {f.percent(matching.score_moyen ?? 0, 1)} ·{' '}
                {t.admin.openRate} : {f.percent(matching.taux_ouverture ?? 0, 1)}
              </p>
            </div>
            <Link href={path('/admin/matching')} className="text-sm font-semibold text-argile-600">
              {t.admin.exploreMatching}
            </Link>
          </div>

          <SegmentBar
            emptyLabel={t.admin.noMatch}
            segments={[
              { label: t.admin.qualityExcellent, value: matching.excellents ?? 0, color: 'bg-emerald-600' },
              { label: t.admin.qualityGood, value: matching.tres_bons ?? 0, color: 'bg-zellige-500' },
              { label: t.admin.qualityFair, value: matching.interessants ?? 0, color: 'bg-safran-400' },
              { label: t.admin.qualityLow, value: matching.faibles ?? 0, color: 'bg-sable-400' },
            ]}
          />

          <dl className="mt-5 grid gap-4 sm:grid-cols-4">
            {[
              { label: t.admin.notified, value: matching.notifies ?? 0 },
              { label: t.admin.viewed, value: matching.vus ?? 0 },
              { label: t.admin.interests, value: matching.interesses ?? 0 },
              { label: t.admin.converted, value: matching.convertis ?? 0 },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-xs tracking-wide text-encre-400 uppercase">{item.label}</dt>
                <dd className="mt-1 text-xl font-bold text-encre-900">{f.number(item.value)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>
    </div>
  )
}
