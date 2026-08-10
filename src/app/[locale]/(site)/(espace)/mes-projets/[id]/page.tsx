import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { decideParticipation } from '@/app/actions/interactions'
import { cancelProject, submitProject } from '@/app/actions/projects'
import { Alert, Badge, Button, Card, LinkButton, ProgressBar } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { PROJECT_WORKFLOW } from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ParticipationStatus, ProjectPublic } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: getDictionary(resolveLocale(locale)).myProjects.manageTitle }
}

interface ParticipantRow {
  id: string
  participant_id: string
  units_wanted: number
  message: string | null
  status: ParticipationStatus
  created_at: string
}

export default async function GererProjetPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale: raw, id } = await params
  const locale = resolveLocale(raw)
  const { t, f, path } = translation(locale)

  const query = await searchParams
  const session = await requireSession(`/mes-projets/${id}`)
  const supabase = await createSupabaseServerClient()

  const { data: project } = await supabase
    .from('projects_public')
    .select('*')
    .eq('id', id)
    .maybeSingle<ProjectPublic>()
  if (!project) notFound()

  const { data: owner } = await supabase
    .from('projects')
    .select('created_by')
    .eq('id', id)
    .maybeSingle<{ created_by: string | null }>()

  const isOwner = owner?.created_by === session.userId

  const [{ data: participants }, { data: profiles }] = await Promise.all([
    supabase
      .from('project_participants')
      .select('id, participant_id, units_wanted, message, status, created_at')
      .eq('project_id', id)
      .order('created_at')
      .returns<ParticipantRow[]>(),
    supabase.from('public_profiles').select('id, first_name, last_initial, professional_body'),
  ])

  const nameById = new Map(
    (profiles ?? []).map((p: { id: string; first_name: string; last_initial: string }) => [
      p.id,
      `${p.first_name} ${p.last_initial}`.trim(),
    ]),
  )

  const pending = (participants ?? []).filter((p) => p.status === 'candidature')
  const accepted = (participants ?? []).filter((p) => p.status === 'accepte')
  const currentStep = PROJECT_WORKFLOW.indexOf(project.status)

  return (
    <div>
      <nav className="mb-5 text-sm text-encre-400">
        <Link href={path('/mes-projets')} className="hover:text-zellige-600">
          {t.myProjects.title}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-encre-700">{project.title}</span>
      </nav>

      {query.cree ? (
        <div className="mb-5">
          <Alert tone="succes" title={t.myProjects.createdOk}>
            {t.myProjects.createdBody}
          </Alert>
        </div>
      ) : null}

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={project.status === 'ouvert' ? 'zellige' : 'neutre'}>
            {t.enums.projectStatus[project.status]}
          </Badge>
          {project.restricted_to_body ? (
            <Badge tone="argile">
              👥 {t.enums.professionalBodyPlural[project.restricted_to_body]}
            </Badge>
          ) : null}
          {project.reference ? (
            <Badge>
              {t.common.reference} <span className="ltr-inline">{project.reference}</span>
            </Badge>
          ) : null}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-encre-900">{project.title}</h1>
        <p className="mt-1 text-sm text-encre-500">
          📍 {[project.city_name, project.region_name].filter(Boolean).join(' — ')} ·{' '}
          {t.enums.propertyNeed[project.property_need]} · {project.units_planned} {t.common.housing}
          {project.budget_per_unit ? ` · ${f.dh(project.budget_per_unit)}` : ''}
        </p>
      </header>

      <Card className="mb-6">
        <h2 className="font-semibold text-encre-900">{t.projects.progress}</h2>
        <ol className="mt-3 flex flex-wrap gap-2">
          {PROJECT_WORKFLOW.map((status, index) => {
            const done = currentStep >= 0 && index <= currentStep
            return (
              <li
                key={status}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  done
                    ? 'border-zellige-200 bg-zellige-100 text-zellige-800'
                    : 'border-sable-300 bg-sable-100 text-encre-400'
                }`}
              >
                {index + 1}. {t.enums.projectStatus[status]}
              </li>
            )
          })}
        </ol>
        <div className="mt-4 max-w-sm">
          <ProgressBar value={project.participants_confirmed} max={project.participants_target} />
        </div>
      </Card>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-bold text-encre-900">
          {t.myProjects.pendingTitle} ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <Card className="text-sm text-encre-500">{t.myProjects.noPending}</Card>
        ) : (
          <div className="space-y-3">
            {pending.map((participation) => (
              <Card key={participation.id} className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-encre-900">
                    {nameById.get(participation.participant_id) ?? t.enums.role.participant}
                  </p>
                  <p className="mt-0.5 text-sm text-encre-500">
                    {participation.units_wanted} {t.common.units} · {t.myProjects.applicationOf}{' '}
                    {f.date(participation.created_at)}
                  </p>
                  {participation.message ? (
                    <p className="mt-2 rounded-lg bg-sable-100 px-3 py-2 text-sm text-encre-700">
                      {participation.message}
                    </p>
                  ) : null}
                </div>
                {isOwner ? (
                  <div className="flex shrink-0 gap-2">
                    <form action={decideParticipation}>
                      <input type="hidden" name="participation_id" value={participation.id} />
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="decision" value="accepte" />
                      <Button type="submit" variant="collectif" size="sm">
                        {t.myProjects.accept}
                      </Button>
                    </form>
                    <form action={decideParticipation}>
                      <input type="hidden" name="participation_id" value={participation.id} />
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="decision" value="refuse" />
                      <Button type="submit" variant="ghost" size="sm">
                        {t.myProjects.refuse}
                      </Button>
                    </form>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-bold text-encre-900">
          {t.myProjects.membersTitle} ({accepted.length} / {project.participants_target})
        </h2>
        <Card className="p-0">
          <ul className="divide-y divide-sable-200">
            {accepted.map((participation) => (
              <li key={participation.id} className="flex items-center gap-3 px-5 py-3">
                <span className="grid size-8 place-items-center rounded-full bg-zellige-100 text-sm font-bold text-zellige-700">
                  {(nameById.get(participation.participant_id) ?? '?').charAt(0)}
                </span>
                <span className="flex-1 text-sm font-medium text-encre-900">
                  {nameById.get(participation.participant_id) ?? t.enums.role.participant}
                </span>
                <span className="text-xs text-encre-400">
                  {participation.units_wanted} {t.common.units}
                </span>
                <Badge tone="succes">{t.enums.participationStatus[participation.status]}</Badge>
              </li>
            ))}
            {accepted.length === 0 ? (
              <li className="px-5 py-4 text-sm text-encre-400">{t.myProjects.noMembers}</li>
            ) : null}
          </ul>
        </Card>
      </section>

      {isOwner ? (
        <Card>
          <h2 className="font-semibold text-encre-900">{t.myLands.actions}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {project.status === 'proposition' ? (
              <form action={submitProject}>
                <input type="hidden" name="project_id" value={project.id} />
                <Button type="submit" variant="collectif" size="sm">
                  {t.myProjects.submitForReview}
                </Button>
              </form>
            ) : null}
            <LinkButton href={path(`/projets/${project.id}`)} variant="secondary" size="sm">
              {t.myLands.seePublic}
            </LinkButton>
            {['proposition', 'analyse'].includes(project.status) ? (
              <form action={cancelProject}>
                <input type="hidden" name="project_id" value={project.id} />
                <Button type="submit" variant="danger" size="sm">
                  {t.myProjects.cancelProject}
                </Button>
              </form>
            ) : null}
          </div>
          {project.status === 'analyse' ? (
            <p className="mt-3 text-sm text-encre-400">{t.myProjects.underReview}</p>
          ) : null}
        </Card>
      ) : null}
    </div>
  )
}
