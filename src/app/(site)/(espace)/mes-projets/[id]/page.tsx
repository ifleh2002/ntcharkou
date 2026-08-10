import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { decideParticipation } from '@/app/actions/interactions'
import { cancelProject, submitProject } from '@/app/actions/projects'
import { Alert, Badge, Button, Card, LinkButton, ProgressBar } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { formatDate, formatDh } from '@/lib/format'
import {
  PARTICIPATION_STATUS_LABELS,
  PROFESSIONAL_BODY_PLURAL,
  PROJECT_STATUS_LABELS,
  PROJECT_WORKFLOW,
  PROPERTY_NEED_LABELS,
} from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ParticipationStatus, ProjectPublic } from '@/lib/types'

export const metadata: Metadata = { title: 'Gérer mon projet' }

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
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
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
        <Link href="/mes-projets" className="hover:text-zellige-600">
          Mes projets
        </Link>
        <span className="mx-2">/</span>
        <span className="text-encre-700">{project.title}</span>
      </nav>

      {query.cree ? (
        <div className="mb-5">
          <Alert tone="succes" title="Groupe créé">
            Votre groupe est enregistré en proposition. Soumettez-le à l’analyse pour qu’il soit
            validé puis ouvert aux candidatures.
          </Alert>
        </div>
      ) : null}

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={project.status === 'ouvert' ? 'zellige' : 'neutre'}>
            {PROJECT_STATUS_LABELS[project.status]}
          </Badge>
          {project.restricted_to_body ? (
            <Badge tone="argile">
              👥 {PROFESSIONAL_BODY_PLURAL[project.restricted_to_body]}
            </Badge>
          ) : null}
          {project.reference ? <Badge>Réf. {project.reference}</Badge> : null}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-encre-900">{project.title}</h1>
        <p className="mt-1 text-sm text-encre-500">
          📍 {[project.city_name, project.region_name].filter(Boolean).join(' — ')} ·{' '}
          {PROPERTY_NEED_LABELS[project.property_need]} · {project.units_planned} logements
          {project.budget_per_unit ? ` · ${formatDh(project.budget_per_unit)} par logement` : ''}
        </p>
      </header>

      <Card className="mb-6">
        <h2 className="font-semibold text-encre-900">Avancement</h2>
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
                {index + 1}. {PROJECT_STATUS_LABELS[status]}
              </li>
            )
          })}
        </ol>
        <div className="mt-4 max-w-sm">
          <ProgressBar value={project.participants_confirmed} max={project.participants_target} />
        </div>
      </Card>

      {/* --- Candidatures ------------------------------------------------ */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-bold text-encre-900">
          Candidatures en attente ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <Card className="text-sm text-encre-500">Aucune candidature en attente.</Card>
        ) : (
          <div className="space-y-3">
            {pending.map((participation) => (
              <Card key={participation.id} className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-encre-900">
                    {nameById.get(participation.participant_id) ?? 'Participant'}
                  </p>
                  <p className="mt-0.5 text-sm text-encre-500">
                    {participation.units_wanted} unité{participation.units_wanted > 1 ? 's' : ''} ·
                    candidature du {formatDate(participation.created_at)}
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
                        Accepter
                      </Button>
                    </form>
                    <form action={decideParticipation}>
                      <input type="hidden" name="participation_id" value={participation.id} />
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="decision" value="refuse" />
                      <Button type="submit" variant="ghost" size="sm">
                        Refuser
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
          Membres confirmés ({accepted.length} / {project.participants_target})
        </h2>
        <Card className="p-0">
          <ul className="divide-y divide-sable-200">
            {accepted.map((participation) => (
              <li key={participation.id} className="flex items-center gap-3 px-5 py-3">
                <span className="grid size-8 place-items-center rounded-full bg-zellige-100 text-sm font-bold text-zellige-700">
                  {(nameById.get(participation.participant_id) ?? '?').charAt(0)}
                </span>
                <span className="flex-1 text-sm font-medium text-encre-900">
                  {nameById.get(participation.participant_id) ?? 'Participant'}
                </span>
                <span className="text-xs text-encre-400">
                  {participation.units_wanted} unité{participation.units_wanted > 1 ? 's' : ''}
                </span>
                <Badge tone="succes">{PARTICIPATION_STATUS_LABELS[participation.status]}</Badge>
              </li>
            ))}
            {accepted.length === 0 ? (
              <li className="px-5 py-4 text-sm text-encre-400">Aucun membre confirmé.</li>
            ) : null}
          </ul>
        </Card>
      </section>

      {isOwner ? (
        <Card>
          <h2 className="font-semibold text-encre-900">Actions</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {project.status === 'proposition' ? (
              <form action={submitProject}>
                <input type="hidden" name="project_id" value={project.id} />
                <Button type="submit" variant="collectif" size="sm">
                  Soumettre à l’analyse
                </Button>
              </form>
            ) : null}
            <LinkButton href={`/projets/${project.id}`} variant="secondary" size="sm">
              Voir la fiche publique
            </LinkButton>
            {['proposition', 'analyse'].includes(project.status) ? (
              <form action={cancelProject}>
                <input type="hidden" name="project_id" value={project.id} />
                <Button type="submit" variant="danger" size="sm">
                  Annuler le projet
                </Button>
              </form>
            ) : null}
          </div>
          {project.status === 'analyse' ? (
            <p className="mt-3 text-sm text-encre-400">
              Votre groupe est en cours d’analyse. L’administration l’ouvrira aux candidatures une
              fois le dossier validé.
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  )
}
