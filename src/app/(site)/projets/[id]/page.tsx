import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { joinProject, leaveProject, toggleFavorite } from '@/app/actions/interactions'
import { Alert, Badge, Button, Card, LinkButton, ProgressBar } from '@/components/ui'
import { getSessionContext } from '@/lib/auth'
import { formatDate, formatDh } from '@/lib/format'
import {
  PARTICIPATION_STATUS_LABELS,
  PROFESSIONAL_BODY_PLURAL,
  PROJECT_STATUS_LABELS,
  PROJECT_WORKFLOW,
  PROPERTY_NEED_LABELS,
  ZONING_LABELS,
} from '@/lib/labels'
import { getProject } from '@/lib/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ParticipationStatus } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const project = await getProject(id)
  return project ? { title: project.title } : { title: 'Projet introuvable' }
}

export default async function ProjetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const query = await searchParams
  const project = await getProject(id)
  if (!project) notFound()

  const session = await getSessionContext()

  let participation: { id: string; status: ParticipationStatus } | null = null
  if (session) {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('project_participants')
      .select('id, status')
      .eq('project_id', id)
      .eq('participant_id', session.userId)
      .maybeSingle()
    participation = (data as { id: string; status: ParticipationStatus } | null) ?? null
  }

  const remaining = Math.max(0, project.participants_target - project.participants_confirmed)
  const currentStep = PROJECT_WORKFLOW.indexOf(project.status)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-5 text-sm text-encre-400">
        <Link href="/projets" className="hover:text-zellige-600">
          Projets participatifs
        </Link>
        <span className="mx-2">/</span>
        <span className="text-encre-700">{project.title}</span>
      </nav>

      {query.candidature ? (
        <div className="mb-5">
          <Alert tone="succes" title="Candidature envoyée">
            Le porteur du projet a été prévenu. Vous recevrez une notification dès qu’une décision
            sera prise.
          </Alert>
        </div>
      ) : null}
      {query.erreur === 'candidature' ? (
        <div className="mb-5">
          <Alert tone="danger" title="Candidature impossible">
            Vous avez peut-être déjà candidaté à ce projet, ou celui-ci n’est plus ouvert.
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={project.status === 'ouvert' ? 'zellige' : 'neutre'}>
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
            {project.restricted_to_body ? (
              <Badge tone="argile">
                👥 Réservé aux {PROFESSIONAL_BODY_PLURAL[project.restricted_to_body].toLowerCase()}
              </Badge>
            ) : null}
            {project.reference ? <Badge>Réf. {project.reference}</Badge> : null}
          </div>

          <h1 className="mt-3 text-3xl font-bold text-encre-900">🏢 {project.title}</h1>
          <p className="mt-2 text-encre-500">
            📍 {[project.district, project.city_name, project.region_name].filter(Boolean).join(' — ')}
          </p>
          {project.summary ? <p className="mt-4 text-lg text-encre-700">{project.summary}</p> : null}

          {/* --- Avancement du workflow (section 14) ---------------------- */}
          <section className="mt-8">
            <h2 className="mb-3 text-xl font-bold text-encre-900">Avancement</h2>
            <Card>
              <ol className="flex flex-wrap gap-2">
                {PROJECT_WORKFLOW.map((step, index) => {
                  const done = currentStep >= 0 && index <= currentStep
                  return (
                    <li
                      key={step}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        done
                          ? 'border-zellige-200 bg-zellige-100 text-zellige-800'
                          : 'border-sable-300 bg-sable-100 text-encre-400'
                      }`}
                    >
                      {index + 1}. {PROJECT_STATUS_LABELS[step]}
                    </li>
                  )
                })}
              </ol>
              {project.status === 'annule' ? (
                <p className="mt-3 text-sm font-medium text-red-700">Ce projet a été annulé.</p>
              ) : null}
            </Card>
          </section>

          {/* --- Caracteristiques ---------------------------------------- */}
          <section className="mt-8">
            <h2 className="mb-3 text-xl font-bold text-encre-900">Le projet</h2>
            <Card>
              <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {[
                  { label: 'Typologie', value: PROPERTY_NEED_LABELS[project.property_need] },
                  { label: 'Zonage', value: project.zoning ? ZONING_LABELS[project.zoning] : '—' },
                  { label: 'Unités prévues', value: project.units_planned },
                  { label: 'Participants recherchés', value: project.participants_target },
                  {
                    label: 'Budget par unité',
                    value: project.budget_per_unit ? formatDh(project.budget_per_unit) : '—',
                  },
                  { label: 'Ouvert le', value: formatDate(project.opened_at) },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between gap-4 border-b border-sable-200 pb-2"
                  >
                    <dt className="text-sm text-encre-500">{row.label}</dt>
                    <dd className="text-sm font-medium text-encre-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </section>

          {project.description ? (
            <section className="mt-8">
              <h2 className="mb-3 text-xl font-bold text-encre-900">Description</h2>
              <Card>
                <p className="text-sm leading-relaxed whitespace-pre-line text-encre-700">
                  {project.description}
                </p>
              </Card>
            </section>
          ) : null}

          {project.land_id ? (
            <section className="mt-8">
              <h2 className="mb-3 text-xl font-bold text-encre-900">Terrain rattaché</h2>
              <Card>
                <p className="text-sm text-encre-500">
                  Ce projet s’appuie sur un terrain validé par l’administration.
                </p>
                <LinkButton
                  href={`/terrains/${project.land_id}`}
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                >
                  Voir la fiche du terrain
                </LinkButton>
              </Card>
            </section>
          ) : null}
        </div>

        {/* --- Colonne d'action ------------------------------------------ */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <h2 className="font-semibold text-encre-900">Constitution du groupe</h2>
            <div className="mt-3">
              <ProgressBar
                value={project.participants_confirmed}
                max={project.participants_target}
              />
            </div>
            <p className="mt-3 text-sm text-encre-500">
              {remaining > 0
                ? `Il reste ${remaining} place${remaining > 1 ? 's' : ''} à pourvoir.`
                : 'Le groupe est au complet.'}
              {project.participants_pending > 0
                ? ` ${project.participants_pending} candidature${
                    project.participants_pending > 1 ? 's' : ''
                  } en attente.`
                : ''}
            </p>

            <div className="mt-5 space-y-2">
              {participation ? (
                <>
                  <Alert tone={participation.status === 'accepte' ? 'succes' : 'info'}>
                    Votre candidature : {PARTICIPATION_STATUS_LABELS[participation.status]}
                  </Alert>
                  {participation.status === 'candidature' ? (
                    <form action={leaveProject}>
                      <input type="hidden" name="project_id" value={project.id} />
                      <Button type="submit" variant="secondary" className="w-full">
                        Retirer ma candidature
                      </Button>
                    </form>
                  ) : null}
                </>
              ) : project.status === 'ouvert' ? (
                <form action={joinProject} className="space-y-3">
                  <input type="hidden" name="project_id" value={project.id} />
                  <div>
                    <label className="etiquette" htmlFor="units">
                      Nombre d’unités souhaitées
                    </label>
                    <input
                      id="units"
                      name="units_wanted"
                      type="number"
                      min="1"
                      defaultValue="1"
                      className="champ"
                    />
                  </div>
                  <div>
                    <label className="etiquette" htmlFor="message">
                      Message (facultatif)
                    </label>
                    <textarea id="message" name="message" rows={3} className="champ" />
                  </div>
                  <Button type="submit" variant="collectif" size="lg" className="w-full">
                    Rejoindre le projet
                  </Button>
                </form>
              ) : (
                <Alert tone="info">
                  Ce projet n’accepte pas de nouvelle candidature pour le moment.
                </Alert>
              )}

              <form action={toggleFavorite}>
                <input type="hidden" name="project_id" value={project.id} />
                <input type="hidden" name="return_to" value={`/projets/${project.id}`} />
                <Button type="submit" variant="ghost" className="w-full">
                  🤍 Suivre ce projet
                </Button>
              </form>
            </div>
          </Card>

          <p className="mt-4 px-2 text-xs leading-relaxed text-encre-400">
            L’identité des autres participants n’est pas publiée. Elle n’est partagée qu’une fois le
            groupe constitué et le projet validé.
          </p>
        </aside>
      </div>
    </div>
  )
}
