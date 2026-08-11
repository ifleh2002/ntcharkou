import type { Metadata } from 'next'
import { ProjectCard } from '@/components/project-card'
import { ProjectFilters } from '@/components/project-filters'
import { EmptyState, LinkButton } from '@/components/ui'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { PROPERTY_NEED_ORDER } from '@/lib/labels'
import { getRegions, listProjects } from '@/lib/queries'
import type { PropertyNeed } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = getDictionary(resolveLocale(locale))
  return { title: t.projects.title, description: t.projects.lead }
}

export default async function ProjetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const tr = translation(locale)
  const { t, path } = tr

  const query = await searchParams
  const region = typeof query.region === 'string' ? query.region : undefined
  const need = typeof query.typologie === 'string' ? (query.typologie as PropertyNeed) : undefined
  const onlyOpen = query.ouverts === '1'

  const [regions, projects] = await Promise.all([
    getRegions(locale),
    listProjects({ region, need, onlyOpen, perPage: 24 }, locale),
  ])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-encre-900">{t.projects.title}</h1>
        <p className="mt-2 max-w-2xl text-encre-500">{t.projects.lead}</p>
      </header>

      <ProjectFilters
        regions={regions}
        region={region}
        need={need}
        onlyOpen={onlyOpen}
        t={t}
      />

      {projects.items.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.items.map((project) => (
            <ProjectCard key={project.id} project={project} tr={tr} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🏗️"
          title={t.projects.emptyTitle}
          description={t.projects.emptyBody}
          action={
            <LinkButton href={path('/terrains')} variant="collectif" size="sm" className="mt-2">
              {t.projects.browseLands}
            </LinkButton>
          }
        />
      )}
    </div>
  )
}
