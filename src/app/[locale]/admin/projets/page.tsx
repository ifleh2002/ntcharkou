import type { Metadata } from 'next'
import Link from 'next/link'
import { reviewProject } from '@/app/actions/admin'
import { AdminPricingForm } from '@/components/admin-pricing-form'
import { Badge, Button, Card, LinkButton, ProgressBar } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ProjectPublic, ProjectStatus } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: `${getDictionary(resolveLocale(locale)).admin.projectsTitle} — Ntcharkou` }
}

const NEXT_STATUS: Partial<Record<ProjectStatus, { status: ProjectStatus; labelKey: string }>> = {
  proposition: { status: 'analyse', labelKey: 'moveToAnalysis' },
  analyse: { status: 'validation_admin', labelKey: 'moveToValidation' },
  validation_admin: { status: 'ouvert', labelKey: 'openToParticipants' },
  groupe_constitue: { status: 'en_preparation', labelKey: 'moveToPreparation' },
  en_preparation: { status: 'realise', labelKey: 'markAchieved' },
}

export default async function AdminProjetsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const { t, f, path } = translation(locale)

  await requireAdmin()
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('projects_public')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
    .returns<ProjectPublic[]>()

  const projects = (data ?? []).map((project) => ({
    ...project,
    region_name:
      locale === 'ar' ? (project.region_name_ar ?? project.region_name) : project.region_name,
    city_name: locale === 'ar' ? (project.city_name_ar ?? project.city_name) : project.city_name,
  }))

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-encre-900">{t.admin.projectsTitle}</h1>
          <p className="mt-1 text-sm text-encre-500">
            {projects.length} {t.admin.projectsCount}
          </p>
        </div>
        {/* Unique porte d'entrée : un projet naît d'un terrain déjà validé. */}
        <LinkButton href={path('/admin/projets/nouveau')} variant="collectif" size="sm">
          {t.adminProjects.newTitle}
        </LinkButton>
      </header>

      <div className="space-y-4">
        {projects.map((project) => {
          const next = NEXT_STATUS[project.status]
          return (
            <Card key={project.id} className="flex flex-wrap items-start gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={project.status === 'ouvert' ? 'zellige' : 'neutre'}>
                    {t.enums.projectStatus[project.status]}
                  </Badge>
                  {project.restricted_to_body ? (
                    <Badge tone="argile">
                      👥 {t.enums.professionalBodyPlural[project.restricted_to_body]}
                    </Badge>
                  ) : null}
                  {project.reference ? <Badge>{project.reference}</Badge> : null}
                </div>
                <h2 className="mt-2 font-semibold text-encre-900">
                  <Link href={path(`/projets/${project.id}`)} className="hover:text-zellige-600">
                    {project.title}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-encre-500">
                  {[project.city_name, project.region_name].filter(Boolean).join(' — ')} ·{' '}
                  {t.enums.propertyNeed[project.property_need]} · {project.units_planned}{' '}
                  {t.common.housing} · {f.dhCompact(project.budget_per_unit)} · {t.common.createdOn}{' '}
                  {f.date(project.created_at)}
                </p>
                <div className="mt-3 max-w-xs">
                  <ProgressBar
                    value={project.participants_confirmed}
                    max={project.units_planned}
                  />
                  <p className="mt-1 text-xs text-encre-500">
                    {project.participants_confirmed} / {project.units_planned}{' '}
                    {t.projects.unitsTaken}
                  </p>
                </div>

                <AdminPricingForm project={project} t={t} locale={locale} />
                {project.participants_pending > 0 ? (
                  <p className="mt-1 text-xs text-encre-400">
                    {project.participants_pending} {t.admin.pendingCount}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-col gap-2">
                {next ? (
                  <form action={reviewProject}>
                    <input type="hidden" name="project_id" value={project.id} />
                    <input type="hidden" name="status" value={next.status} />
                    <Button type="submit" variant="collectif" size="sm" className="w-full">
                      {t.admin[next.labelKey as keyof typeof t.admin]}
                    </Button>
                  </form>
                ) : null}
                {project.status !== 'annule' && project.status !== 'realise' ? (
                  <form action={reviewProject}>
                    <input type="hidden" name="project_id" value={project.id} />
                    <input type="hidden" name="status" value="annule" />
                    <input type="hidden" name="reason" value={t.admin.cancelledByAdmin} />
                    <Button type="submit" variant="danger" size="sm" className="w-full">
                      {t.admin.cancel}
                    </Button>
                  </form>
                ) : null}
              </div>
            </Card>
          )
        })}

        {projects.length === 0 ? (
          <Card className="py-10 text-center text-encre-400">{t.admin.noProjects}</Card>
        ) : null}
      </div>
    </div>
  )
}
