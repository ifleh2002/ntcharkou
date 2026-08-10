import type { Metadata } from 'next'
import Link from 'next/link'
import { reviewLand, reviewProject } from '@/app/actions/admin'
import { Badge, Button, Card, EmptyState, Field } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { LandZoning, ListingStatus, ProjectStatus } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: `${getDictionary(resolveLocale(locale)).admin.validationsTitle} — Ntcharkou` }
}

interface PendingLand {
  id: string
  reference: string | null
  title: string
  status: ListingStatus
  zoning: LandZoning
  surface_m2: number
  total_price: number | null
  submitted_at: string | null
  created_at: string
  region_code: string
  district: string | null
  land_title_ref: string | null
}

interface PendingProject {
  id: string
  reference: string | null
  title: string
  status: ProjectStatus
  units_planned: number
  participants_target: number
  region_code: string
  created_at: string
}

export default async function ValidationsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const { t, f, path } = translation(resolveLocale(raw))

  await requireAdmin()
  const supabase = await createSupabaseServerClient()

  const [lands, projects, docCounts] = await Promise.all([
    supabase
      .from('land_listings')
      .select(
        'id, reference, title, status, zoning, surface_m2, total_price, submitted_at, created_at, region_code, district, land_title_ref',
      )
      .in('status', ['soumis', 'en_verification', 'valide'])
      .order('submitted_at', { ascending: true, nullsFirst: false })
      .returns<PendingLand[]>(),
    supabase
      .from('projects')
      .select(
        'id, reference, title, status, units_planned, participants_target, region_code, created_at',
      )
      .in('status', ['analyse', 'validation_admin'])
      .order('created_at')
      .returns<PendingProject[]>(),
    supabase.from('land_documents').select('land_id'),
  ])

  const docsByLand = new Map<string, number>()
  for (const row of docCounts.data ?? []) {
    docsByLand.set(row.land_id, (docsByLand.get(row.land_id) ?? 0) + 1)
  }

  const pendingLands = lands.data ?? []
  const pendingProjects = projects.data ?? []

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-encre-900">{t.admin.validationsTitle}</h1>
        <p className="mt-1 text-sm text-encre-500">
          {t.admin.validationsLead}
        </p>
      </header>

      {/* --- Terrains ---------------------------------------------------- */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-encre-900">
          {t.admin.pendingLands} ({pendingLands.length})
        </h2>

        {pendingLands.length === 0 ? (
          <EmptyState icon="✅" title={t.admin.noPendingLands} description={t.admin.queueEmpty} />
        ) : (
          <div className="space-y-4">
            {pendingLands.map((land) => (
              <Card key={land.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="alerte">{t.enums.listingStatus[land.status]}</Badge>
                      <Badge tone="argile">{t.enums.zoning[land.zoning]}</Badge>
                      {land.reference ? <Badge>{land.reference}</Badge> : null}
                      <Badge tone={(docsByLand.get(land.id) ?? 0) > 0 ? 'succes' : 'danger'}>
                        🔒 {docsByLand.get(land.id) ?? 0} {t.admin.documentsCount}
                      </Badge>
                    </div>
                    <h3 className="mt-2 font-semibold text-encre-900">{land.title}</h3>
                    <p className="mt-1 text-sm text-encre-500">
                      {f.surface(land.surface_m2)} · {f.dh(land.total_price)} ·{' '}
                      {land.district ?? '—'} · {t.common.submittedOn}{' '}
                      {f.date(land.submitted_at ?? land.created_at)}
                    </p>
                    <p className="mt-1 text-sm text-encre-400">
                      {t.admin.landTitleRef} : {land.land_title_ref || t.admin.notProvided}
                    </p>
                    <Link
                      href={path(`/terrains/${land.id}`)}
                      className="mt-2 inline-block text-sm font-semibold text-argile-600"
                    >
                      {t.admin.seeFullListing}
                    </Link>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-sable-200 pt-4">
                  {land.status === 'soumis' ? (
                    <form action={reviewLand}>
                      <input type="hidden" name="land_id" value={land.id} />
                      <input type="hidden" name="status" value="en_verification" />
                      <Button type="submit" variant="secondary" size="sm">
                        {t.admin.takeForReview}
                      </Button>
                    </form>
                  ) : null}

                  <form action={reviewLand}>
                    <input type="hidden" name="land_id" value={land.id} />
                    <input type="hidden" name="status" value="publie" />
                    <Button type="submit" size="sm">
                      {t.admin.validateAndPublish}
                    </Button>
                  </form>

                  <form action={reviewLand} className="flex items-end gap-2">
                    <input type="hidden" name="land_id" value={land.id} />
                    <input type="hidden" name="status" value="refuse" />
                    <div className="w-64">
                      <Field label={t.admin.rejectionReason} htmlFor={`reason-${land.id}`}>
                        <input
                          id={`reason-${land.id}`}
                          name="reason"
                          className="champ"
                          placeholder={t.admin.rejectionPlaceholder}
                          required
                        />
                      </Field>
                    </div>
                    <Button type="submit" variant="danger" size="sm">
                      {t.admin.reject}
                    </Button>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* --- Projets ----------------------------------------------------- */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-encre-900">
          {t.admin.pendingProjects} ({pendingProjects.length})
        </h2>

        {pendingProjects.length === 0 ? (
          <EmptyState icon="🏗️" title={t.admin.noPendingProjects} />
        ) : (
          <div className="space-y-4">
            {pendingProjects.map((project) => (
              <Card key={project.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="alerte">{t.enums.projectStatus[project.status]}</Badge>
                  {project.reference ? <Badge>{project.reference}</Badge> : null}
                </div>
                <h3 className="mt-2 font-semibold text-encre-900">{project.title}</h3>
                <p className="mt-1 text-sm text-encre-500">
                  {project.units_planned} {t.common.housing} · {project.participants_target}{' '}
                  {t.common.participants} · {t.common.createdOn} {f.date(project.created_at)}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-sable-200 pt-4">
                  {project.status === 'analyse' ? (
                    <form action={reviewProject}>
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="status" value="validation_admin" />
                      <Button type="submit" variant="secondary" size="sm">
                        {t.admin.moveToValidation}
                      </Button>
                    </form>
                  ) : null}
                  <form action={reviewProject}>
                    <input type="hidden" name="project_id" value={project.id} />
                    <input type="hidden" name="status" value="ouvert" />
                    <Button type="submit" variant="collectif" size="sm">
                      {t.admin.openToParticipants}
                    </Button>
                  </form>
                  <form action={reviewProject}>
                    <input type="hidden" name="project_id" value={project.id} />
                    <input type="hidden" name="status" value="annule" />
                    <input type="hidden" name="reason" value={t.admin.cancelledByAdmin} />
                    <Button type="submit" variant="danger" size="sm">
                      {t.admin.reject}
                    </Button>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
