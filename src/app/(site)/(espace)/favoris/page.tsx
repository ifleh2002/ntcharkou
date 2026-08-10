import type { Metadata } from 'next'
import { LandCard } from '@/components/land-card'
import { ProjectCard } from '@/components/project-card'
import { EmptyState, LinkButton, SectionTitle } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { LandListingPublic, ProjectPublic } from '@/lib/types'

export const metadata: Metadata = { title: 'Mes favoris' }

export default async function FavorisPage() {
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
  const projectItems = (projects.data ?? []) as ProjectPublic[]
  const isEmpty = landItems.length === 0 && projectItems.length === 0

  return (
    <div>
      <SectionTitle title="Mes favoris" subtitle="Les terrains et projets que vous suivez." />

      {isEmpty ? (
        <EmptyState
          icon="❤️"
          title="Aucun favori"
          description="Ajoutez un terrain ou un projet à vos favoris pour le retrouver ici et suivre son évolution."
          action={
            <div className="mt-2 flex gap-2">
              <LinkButton href="/terrains" variant="secondary" size="sm">
                Parcourir les terrains
              </LinkButton>
              <LinkButton href="/projets" variant="collectif" size="sm">
                Parcourir les projets
              </LinkButton>
            </div>
          }
        />
      ) : (
        <div className="space-y-10">
          {landItems.length > 0 ? (
            <section>
              <h2 className="mb-4 text-lg font-bold text-encre-900">
                Terrains ({landItems.length})
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {landItems.map((land) => (
                  <LandCard key={land.id} land={land} />
                ))}
              </div>
            </section>
          ) : null}

          {projectItems.length > 0 ? (
            <section>
              <h2 className="mb-4 text-lg font-bold text-encre-900">
                Projets ({projectItems.length})
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {projectItems.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
