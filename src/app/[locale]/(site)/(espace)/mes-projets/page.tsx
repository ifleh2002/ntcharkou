import type { Metadata } from 'next'
import { Badge, Card, EmptyState, LinkButton, ProgressBar, SectionTitle } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ParticipationStatus, ProjectPublic } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: getDictionary(resolveLocale(locale)).myProjects.title }
}

export default async function MesProjetsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const { t, path } = translation(locale)

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
      .returns<
        { id: string; project_id: string; status: ParticipationStatus; units_wanted: number }[]
      >(),
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
        title={t.myProjects.title}
        subtitle={t.myProjects.lead}
        action={
          <LinkButton href={path('/mes-projets/nouveau')} variant="collectif">
            {t.projects.createGroup}
          </LinkButton>
        }
      />

      {myProjects.length === 0 ? (
        <EmptyState
          icon="🏗️"
          title={t.myProjects.emptyTitle}
          description={t.myProjects.emptyBody}
          action={
            <div className="mt-2 flex gap-2">
              <LinkButton href={path('/projets')} variant="secondary" size="sm">
                {t.myProjects.browse}
              </LinkButton>
              <LinkButton href={path('/mes-projets/nouveau')} variant="collectif" size="sm">
                {t.projects.createGroup}
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
                      {t.enums.projectStatus[project.status]}
                    </Badge>
                    {participation ? (
                      <Badge tone={participation.status === 'accepte' ? 'succes' : 'alerte'}>
                        {t.enums.participationStatus[participation.status]}
                      </Badge>
                    ) : null}
                    {project.reference ? (
                      <Badge>
                        {t.common.reference} <span className="ltr-inline">{project.reference}</span>
                      </Badge>
                    ) : null}
                  </div>
                  <h3 className="mt-2 font-semibold text-encre-900">{project.title}</h3>
                  <p className="mt-1 text-sm text-encre-500">
                    📍 {[project.city_name, project.region_name].filter(Boolean).join(' — ')} ·{' '}
                    {project.units_planned} {t.common.housing}
                  </p>
                  <div className="mt-3 max-w-xs">
                    <ProgressBar
                      value={project.participants_confirmed}
                      max={project.participants_target}
                    />
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  <LinkButton href={path(`/mes-projets/${project.id}`)} variant="secondary" size="sm">
                    {t.common.manage}
                  </LinkButton>
                  <LinkButton href={path(`/projets/${project.id}`)} variant="ghost" size="sm">
                    {t.myProjects.publicPage}
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
