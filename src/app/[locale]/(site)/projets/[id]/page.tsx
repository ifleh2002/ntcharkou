import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { joinProject, leaveProject, toggleFavorite } from '@/app/actions/interactions'
import { Cover } from '@/components/cover'
import { PriceComparison } from '@/components/project-card'
import { Alert, Badge, Button, Card, LinkButton, ProgressBar } from '@/components/ui'
import { projectImageUrl } from '@/lib/storage'
import { getSessionContext } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { PROJECT_WORKFLOW } from '@/lib/labels'
import { getProject } from '@/lib/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ParticipationStatus } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}): Promise<Metadata> {
  const { locale, id } = await params
  const project = await getProject(id, resolveLocale(locale))
  return project
    ? { title: project.title }
    : { title: getDictionary(resolveLocale(locale)).projects.notFound }
}

export default async function ProjetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale: raw, id } = await params
  const locale = resolveLocale(raw)
  const tr = translation(locale)
  const { t, f, path } = tr
  const query = await searchParams

  const project = await getProject(id, locale)
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

  const remaining = Math.max(0, project.units_planned - project.participants_confirmed)
  const currentStep = PROJECT_WORKFLOW.indexOf(project.status)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-5 text-sm text-encre-400">
        <Link href={path('/projets')} className="hover:text-zellige-600">
          {t.nav.projects}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-encre-700">{project.title}</span>
      </nav>

      {query.candidature ? (
        <div className="mb-5">
          <Alert tone="succes" title={t.projects.applicationSent}>
            {t.projects.applicationSentBody}
          </Alert>
        </div>
      ) : null}
      {query.erreur === 'candidature' ? (
        <div className="mb-5">
          <Alert tone="danger" title={t.projects.applicationError}>
            {t.projects.applicationErrorBody}
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={project.status === 'ouvert' ? 'zellige' : 'neutre'}>
              {t.enums.projectStatus[project.status]}
            </Badge>
            {project.restricted_to_body ? (
              <Badge tone="argile">
                👥 {t.projects.reservedTo} {t.enums.professionalBodyPlural[project.restricted_to_body]}
              </Badge>
            ) : null}
            {project.reference ? (
              <Badge>
                {t.common.reference} <span className="ltr-inline">{project.reference}</span>
              </Badge>
            ) : null}
          </div>

          <div className="mt-3 aspect-16/9 overflow-hidden rounded-xl bg-sable-200">
            <Cover
              src={projectImageUrl(project.cover_image_path)}
              alt={project.title}
              seed={project.id}
              icon="🏢"
              eager
            />
          </div>

          <h1 className="mt-5 text-3xl font-bold text-encre-900">{project.title}</h1>
          <p className="mt-2 text-encre-500">
            📍 {[project.district, project.city_name, project.region_name].filter(Boolean).join(' — ')}
          </p>
          {project.summary ? <p className="mt-4 text-lg text-encre-700">{project.summary}</p> : null}

          <section className="mt-8">
            <h2 className="mb-3 text-xl font-bold text-encre-900">{t.projects.progress}</h2>
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
                      {index + 1}. {t.enums.projectStatus[step]}
                    </li>
                  )
                })}
              </ol>
              {project.status === 'annule' ? (
                <p className="mt-3 text-sm font-medium text-red-700">{t.projects.cancelled}</p>
              ) : null}
            </Card>
          </section>

          <section className="mt-8">
            <h2 className="mb-3 text-xl font-bold text-encre-900">{t.projects.theProject}</h2>
            <Card>
              <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {[
                  { label: t.projects.typology, value: t.enums.propertyNeed[project.property_need] },
                  {
                    label: t.projectForm.zoningTarget,
                    value: project.zoning ? t.enums.zoning[project.zoning] : '—',
                  },
                  { label: t.projects.plannedUnits, value: project.units_planned },
                  {
                    label: t.projects.unitSurface,
                    value: project.unit_surface_m2 ? f.surface(project.unit_surface_m2) : '—',
                  },
                  {
                    label: t.projects.participatoryPrice,
                    value: project.unit_price ? f.dh(project.unit_price) : '—',
                  },
                  {
                    label: t.projects.marketPriceLabel,
                    value: project.market_unit_price ? f.dh(project.market_unit_price) : '—',
                  },
                  { label: t.projects.openedOn, value: f.date(project.opened_at) },
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
              <h2 className="mb-3 text-xl font-bold text-encre-900">{t.lands.description}</h2>
              <Card>
                <p className="text-sm leading-relaxed whitespace-pre-line text-encre-700">
                  {project.description}
                </p>
              </Card>
            </section>
          ) : null}

          {project.land_id ? (
            <section className="mt-8">
              <h2 className="mb-3 text-xl font-bold text-encre-900">{t.projects.linkedLand}</h2>
              <Card>
                <p className="text-sm text-encre-500">{t.projects.linkedLandBody}</p>
                <LinkButton
                  href={path(`/terrains/${project.land_id}`)}
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                >
                  {t.projects.seeLand}
                </LinkButton>
              </Card>
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-4">
            <PriceComparison project={project} tr={tr} size="lg" />
          </div>

          <Card>
            <h2 className="font-semibold text-encre-900">{t.projects.groupTitle}</h2>
            <div className="mt-3">
              <ProgressBar value={project.participants_confirmed} max={project.units_planned} />
              <p className="mt-2 text-sm">
                <span className="font-bold text-encre-900">
                  {project.participants_confirmed} / {project.units_planned}
                </span>{' '}
                <span className="text-encre-500">{t.projects.unitsTaken}</span>
              </p>
            </div>
            <p className="mt-3 text-sm text-encre-500">
              {remaining > 0
                ? `${remaining} ${remaining > 1 ? t.projects.placesLeft : t.projects.placeLeft}`
                : t.projects.groupFull}
              {project.participants_pending > 0
                ? ` ${project.participants_pending} ${t.projects.pendingApplications}`
                : ''}
            </p>

            <div className="mt-5 space-y-2">
              {participation ? (
                <>
                  <Alert tone={participation.status === 'accepte' ? 'succes' : 'info'}>
                    {t.projects.yourApplication}{' '}
                    {t.enums.participationStatus[participation.status]}
                  </Alert>
                  {participation.status === 'candidature' ? (
                    <form action={leaveProject}>
                      <input type="hidden" name="project_id" value={project.id} />
                      <Button type="submit" variant="secondary" className="w-full">
                        {t.projects.withdrawApplication}
                      </Button>
                    </form>
                  ) : null}
                </>
              ) : project.status === 'ouvert' ? (
                <form action={joinProject} className="space-y-3">
                  <input type="hidden" name="project_id" value={project.id} />
                  <div>
                    <label className="etiquette" htmlFor="units">
                      {t.projects.unitsWanted}
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
                      {t.projects.message}
                    </label>
                    <textarea id="message" name="message" rows={3} className="champ" />
                  </div>
                  <Button type="submit" variant="collectif" size="lg" className="w-full">
                    {t.projects.join}
                  </Button>
                </form>
              ) : (
                <Alert tone="info">{t.projects.closedToApplications}</Alert>
              )}

              <form action={toggleFavorite}>
                <input type="hidden" name="project_id" value={project.id} />
                <input type="hidden" name="return_to" value={`/projets/${project.id}`} />
                <Button type="submit" variant="ghost" className="w-full">
                  🤍 {t.projects.follow}
                </Button>
              </form>
            </div>
          </Card>

          <p className="mt-4 px-2 text-xs leading-relaxed text-encre-400">
            {t.projects.identityNote}
          </p>
        </aside>
      </div>
    </div>
  )
}
