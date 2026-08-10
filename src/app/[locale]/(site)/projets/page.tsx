import type { Metadata } from 'next'
import { ProjectCard } from '@/components/project-card'
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

      <form method="get" className="surface mb-8 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-52 flex-1">
          <label className="etiquette" htmlFor="p-region">
            {t.common.region}
          </label>
          <select id="p-region" name="region" className="champ" defaultValue={region ?? ''}>
            <option value="">{t.common.allRegions}</option>
            {regions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-52 flex-1">
          <label className="etiquette" htmlFor="p-need">
            {t.projects.typology}
          </label>
          <select id="p-need" name="typologie" className="champ" defaultValue={need ?? ''}>
            <option value="">{t.projects.allTypologies}</option>
            {PROPERTY_NEED_ORDER.map((key) => (
              <option key={key} value={key}>
                {t.enums.propertyNeed[key]}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2.5 text-sm text-encre-700">
          <input
            type="checkbox"
            name="ouverts"
            value="1"
            defaultChecked={onlyOpen}
            className="size-4 accent-[var(--color-zellige-500)]"
          />
          {t.projects.onlyOpen}
        </label>
        <button
          type="submit"
          className="rounded-lg bg-zellige-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zellige-600"
        >
          {t.common.filter}
        </button>
      </form>

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
            <LinkButton
              href={path('/mes-projets/nouveau')}
              variant="collectif"
              size="sm"
              className="mt-2"
            >
              {t.projects.createGroup}
            </LinkButton>
          }
        />
      )}
    </div>
  )
}
