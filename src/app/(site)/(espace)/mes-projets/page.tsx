import type { Metadata } from 'next'
import { Badge, Card, EmptyState, LinkButton, ProgressBar, SectionTitle } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { PARTICIPATION_STATUS_LABELS, PROJECT_STATUS_LABELS } from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ParticipationStatus, ProjectPublic } from '@/lib/types'

export const metadata: Metadata = { title: 'Mes projets' }

export default async function MesProjetsPage() {
  const session = await requireSession('/mes-projets')
  const supabase = await createSupabaseServerClient()

  const [created, participations] = await Promise.all([
    supabase
      .from('projects_public')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<ProjectPublic[]>(),
    supabase
      .from('project_participants')
      .select('id, project_id, status, units_wanted')
      .eq('participant_id', session.userId)
      .returns<{ id: string; project_id: string; status: ParticipationStatus; units_wanted: number }[]>(),
  ])

  // La RLS ne renvoie que les projets visibles : ceux que je porte, ceux
  // auxquels je participe, et ceux qui sont publics.
  const participationByProject = new Map(
    (participations.data ?? []).map((row) => [row.project_id, row]),
  )
  const myProjects = (created.data ?? []).filter((project) =>
    participationByProject.has(project.id),
  )

  return (
    <div>
      <SectionTitle
        title="Mes projets"
        subtitle="Les groupes que vous portez et ceux auxquels vous participez."
        action={
          <LinkButton href="/mes-projets/nouveau" variant="collectif">
            Créer mon groupe
          </LinkButton>
        }
      />

      {myProjects.length === 0 ? (
        <EmptyState
          icon="🏗️"
          title="Aucun projet pour l’instant"
          description="Rejoignez un projet participatif ouvert, ou créez votre propre groupe et invitez d’autres participants à vous rejoindre."
          action={
            <div className="mt-2 flex gap-2">
              <LinkButton href="/projets" variant="secondary" size="sm">
                Parcourir les projets
              </LinkButton>
              <LinkButton href="/mes-projets/nouveau" variant="collectif" size="sm">
                Créer mon groupe
              </LinkButton>
            </div>
          }
        />
      ) : (
        <div className="space-y-3">
          {myProjects.map((project) => {
            const participation = participationByProject.get(project.id)
            return (
              <Card key={project.id} className="flex flex-wrap items-start gap-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={project.status === 'ouvert' ? 'zellige' : 'neutre'}>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </Badge>
                    {participation ? (
                      <Badge tone={participation.status === 'accepte' ? 'succes' : 'alerte'}>
                        {PARTICIPATION_STATUS_LABELS[participation.status]}
                      </Badge>
                    ) : null}
                    {project.reference ? <Badge>Réf. {project.reference}</Badge> : null}
                  </div>
                  <h3 className="mt-2 font-semibold text-encre-900">{project.title}</h3>
                  <p className="mt-1 text-sm text-encre-500">
                    📍 {[project.city_name, project.region_name].filter(Boolean).join(' — ')} ·{' '}
                    {project.units_planned} logements
                  </p>
                  <div className="mt-3 max-w-xs">
                    <ProgressBar
                      value={project.participants_confirmed}
                      max={project.participants_target}
                    />
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  <LinkButton href={`/mes-projets/${project.id}`} variant="secondary" size="sm">
                    Gérer
                  </LinkButton>
                  <LinkButton href={`/projets/${project.id}`} variant="ghost" size="sm">
                    Fiche publique
                  </LinkButton>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
