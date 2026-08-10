import Link from 'next/link'
import { LandCard } from '@/components/land-card'
import { ProjectCard } from '@/components/project-card'
import { SearchBar } from '@/components/search-bar'
import { Card, LinkButton, SectionTitle } from '@/components/ui'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { getPublicStats, getRegions, listProjects, searchLands } from '@/lib/queries'

const STEP_ICONS = ['📝', '🛡️', '🎯', '🏢']

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const tr = translation(locale)
  const { t, f, path } = tr

  const [stats, regions, lands, projects] = await Promise.all([
    getPublicStats(),
    getRegions(locale),
    searchLands({ perPage: 6 }, locale),
    listProjects({ perPage: 3, onlyOpen: true }, locale),
  ])

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Bandeau d'accueil (section 23)                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="motif-zellige border-b border-sable-300 bg-sable-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold tracking-wide text-argile-600 uppercase">
              {t.home.eyebrow}
            </p>
            <h1 className="mt-3 text-4xl leading-tight font-bold text-encre-900 sm:text-5xl">
              {t.home.title}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-encre-500">{t.home.lead}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href={path('/mes-terrains/nouveau')} size="lg">
                {t.home.ctaOwner}
              </LinkButton>
              <LinkButton href={path('/mes-demandes/nouvelle')} size="lg" variant="collectif">
                {t.home.ctaParticipant}
              </LinkButton>
              <LinkButton href={path('/projets')} size="lg" variant="secondary">
                {t.home.ctaProjects}
              </LinkButton>
            </div>
          </div>

          <div className="mt-10 max-w-4xl">
            <SearchBar
              regions={regions}
              action={path('/terrains')}
              placeholder={t.home.searchPlaceholder}
              allRegions={t.common.allRegions}
              regionLabel={t.common.region}
              submitLabel={t.common.search}
            />
          </div>

          <dl className="mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: t.home.statLands, value: f.number(stats.lands) },
              { label: t.home.statProjects, value: f.number(stats.projects) },
              { label: t.home.statUnits, value: f.number(stats.units) },
              { label: t.home.statRegions, value: f.number(stats.regions) },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-xs font-semibold tracking-wide text-encre-400 uppercase">
                  {item.label}
                </dt>
                <dd className="mt-1 text-2xl font-bold text-encre-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Comment ca marche                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <SectionTitle
          title={t.home.stepsTitle}
          subtitle={t.home.stepsSubtitle}
          action={
            <LinkButton href={path('/comment-ca-marche')} variant="ghost" size="sm">
              {t.home.stepsMore}
            </LinkButton>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.steps.map((step, index) => (
            <Card key={step.title}>
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>
                  {STEP_ICONS[index]}
                </span>
                <span className="grid size-6 place-items-center rounded-full bg-argile-100 text-xs font-bold text-argile-700">
                  {index + 1}
                </span>
              </div>
              <h3 className="mt-3 font-semibold text-encre-900">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-encre-500">{step.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Terrains recents                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 py-6">
        <SectionTitle
          title={t.home.landsTitle}
          subtitle={
            lands.total > 0
              ? `${f.number(lands.total)} ${t.lands.countMany}`
              : t.home.landsSubtitleEmpty
          }
          action={
            <LinkButton href={path('/terrains')} variant="secondary" size="sm">
              {t.common.seeAll}
            </LinkButton>
          }
        />
        {lands.items.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {lands.items.map((land) => (
              <LandCard key={land.id} land={land} tr={tr} />
            ))}
          </div>
        ) : (
          <Card className="text-center text-sm text-encre-500">
            {t.home.landsEmpty}{' '}
            <Link href={path('/mes-terrains/nouveau')} className="font-semibold text-argile-600">
              {t.home.landsEmptyCta}
            </Link>
            .
          </Card>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Projets participatifs                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <SectionTitle
          title={t.home.projectsTitle}
          subtitle={t.home.projectsSubtitle}
          action={
            <LinkButton href={path('/projets')} variant="secondary" size="sm">
              {t.common.seeAll}
            </LinkButton>
          }
        />
        {projects.items.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.items.map((project) => (
              <ProjectCard key={project.id} project={project} tr={tr} />
            ))}
          </div>
        ) : (
          <Card className="text-center text-sm text-encre-500">
            {t.home.projectsEmpty}{' '}
            <Link href={path('/mes-projets/nouveau')} className="font-semibold text-zellige-600">
              {t.home.projectsEmptyCta}
            </Link>
            .
          </Card>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Groupes professionnels (section 9 / 26)                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="surface overflow-hidden bg-zellige-500 p-0 text-white">
          <div className="grid gap-6 p-8 sm:p-10 lg:grid-cols-[3fr_2fr]">
            <div>
              <h2 className="text-2xl font-bold">{t.home.groupTitle}</h2>
              <p className="mt-3 leading-relaxed text-zellige-50/90">{t.home.groupText}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <LinkButton href={path('/mes-projets/nouveau')} variant="secondary" size="md">
                  {t.home.groupCta}
                </LinkButton>
                <LinkButton
                  href={path('/projets')}
                  variant="ghost"
                  size="md"
                  className="text-white hover:bg-white/10"
                >
                  {t.home.groupSecondary}
                </LinkButton>
              </div>
            </div>
            <div className="rounded-xl bg-white/10 p-5">
              <p className="text-sm font-semibold tracking-wide uppercase opacity-80">
                {t.home.groupExample}
              </p>
              <p className="mt-2 text-lg font-bold">{t.home.groupExampleTitle}</p>
              <ul className="mt-3 space-y-1 text-sm opacity-90">
                <li>{t.home.groupExampleLand}</li>
                <li>{t.home.groupExampleType}</li>
                <li>{t.home.groupExampleUnits}</li>
                <li>{t.home.groupExampleConfirmed}</li>
              </ul>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/25">
                <div className="h-full w-[70%] rounded-full bg-white" />
              </div>
              <p className="mt-1.5 text-xs opacity-80">{t.home.groupExampleProgress}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
