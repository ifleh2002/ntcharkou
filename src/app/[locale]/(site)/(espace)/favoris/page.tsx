import type { Metadata } from 'next'
import { LandCard } from '@/components/land-card'
import { ProjectCard } from '@/components/project-card'
import { EmptyState, LinkButton, SectionTitle } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { localizeProject } from '@/lib/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { LandListingPublic, ProjectPublic } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: getDictionary(resolveLocale(locale)).favorites.title }
}

export default async function FavorisPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const tr = translation(locale)
  const { t, path } = tr

  const session = await requireSession('/favoris')
  const supabase = await createSupabaseServerClient()

  const { data: favorites } = await supabase
    .from('favorites')
    .select('id, land_id, project_id, created_at')
    .eq('profile_id', session.userId)
    .order('created_at', { ascending: false })

  const landIds = (favorites ?? []).map((f) => f.land_id).filter(Boolean) as string[]
  const projectIds = (favorites ?? []).map((f) => f.project_id).filter(Boolean) as string[]

  const [lands, projects] = await Promise.all([
    landIds.length
      ? supabase.from('land_listings_public').select('*').in('id', landIds)
      : Promise.resolve({ data: [] }),
    projectIds.length
      ? supabase.from('projects_public').select('*').in('id', projectIds)
      : Promise.resolve({ data: [] }),
  ])

  const landItems = (lands.data ?? []) as LandListingPublic[]
  const projectItems = ((projects.data ?? []) as ProjectPublic[]).map((project) =>
    localizeProject(project, locale),
  )
  const isEmpty = landItems.length === 0 && projectItems.length === 0

  return (
    <div>
      <SectionTitle title={t.favorites.title} subtitle={t.favorites.lead} />

      {isEmpty ? (
        <EmptyState
          icon="❤️"
          title={t.favorites.emptyTitle}
          description={t.favorites.emptyBody}
          action={
            <div className="mt-2 flex gap-2">
              <LinkButton href={path('/terrains')} variant="secondary" size="sm">
                {t.favorites.browseLands}
              </LinkButton>
              <LinkButton href={path('/projets')} variant="collectif" size="sm">
                {t.favorites.browseProjects}
              </LinkButton>
            </div>
          }
        />
      ) : (
        <div className="space-y-10">
          {landItems.length > 0 ? (
            <section>
              <h2 className="mb-4 text-lg font-bold text-encre-900">
                {t.favorites.lands} ({landItems.length})
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {landItems.map((land) => (
                  <LandCard key={land.id} land={land} tr={tr} />
                ))}
              </div>
            </section>
          ) : null}

          {projectItems.length > 0 ? (
            <section>
              <h2 className="mb-4 text-lg font-bold text-encre-900">
                {t.favorites.projects} ({projectItems.length})
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {projectItems.map((project) => (
                  <ProjectCard key={project.id} project={project} tr={tr} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
