import type { Metadata } from 'next'
import Link from 'next/link'
import { reviewLand, reviewProject } from '@/app/actions/admin'
import { Badge, Button, Card, EmptyState, Field } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { formatDate, formatDh, formatSurface } from '@/lib/format'
import { LISTING_STATUS_LABELS, PROJECT_STATUS_LABELS, ZONING_LABELS } from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { LandZoning, ListingStatus, ProjectStatus } from '@/lib/types'

export const metadata: Metadata = { title: 'Validations — Administration' }

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

export default async function ValidationsPage() {
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
        <h1 className="text-2xl font-bold text-encre-900">Validations</h1>
        <p className="mt-1 text-sm text-encre-500">
          Rien n’est publié automatiquement. Chaque terrain et chaque projet passe par cette file.
        </p>
      </header>

      {/* --- Terrains ---------------------------------------------------- */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-encre-900">
          Terrains en attente ({pendingLands.length})
        </h2>

        {pendingLands.length === 0 ? (
          <EmptyState icon="✅" title="Aucun terrain en attente" description="La file est vide." />
        ) : (
          <div className="space-y-4">
            {pendingLands.map((land) => (
              <Card key={land.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="alerte">{LISTING_STATUS_LABELS[land.status]}</Badge>
                      <Badge tone="argile">{ZONING_LABELS[land.zoning]}</Badge>
                      {land.reference ? <Badge>{land.reference}</Badge> : null}
                      <Badge tone={(docsByLand.get(land.id) ?? 0) > 0 ? 'succes' : 'danger'}>
                        🔒 {docsByLand.get(land.id) ?? 0} document
                        {(docsByLand.get(land.id) ?? 0) > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <h3 className="mt-2 font-semibold text-encre-900">{land.title}</h3>
                    <p className="mt-1 text-sm text-encre-500">
                      {formatSurface(land.surface_m2)} · {formatDh(land.total_price)} ·{' '}
                      {land.district ?? '—'} · soumis le {formatDate(land.submitted_at ?? land.created_at)}
                    </p>
                    <p className="mt-1 text-sm text-encre-400">
                      Titre foncier : {land.land_title_ref || 'non renseigné'}
                    </p>
                    <Link
                      href={`/terrains/${land.id}`}
                      className="mt-2 inline-block text-sm font-semibold text-argile-600"
                    >
                      Consulter la fiche complète →
                    </Link>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-sable-200 pt-4">
                  {land.status === 'soumis' ? (
                    <form action={reviewLand}>
                      <input type="hidden" name="land_id" value={land.id} />
                      <input type="hidden" name="status" value="en_verification" />
                      <Button type="submit" variant="secondary" size="sm">
                        Prendre en vérification
                      </Button>
                    </form>
                  ) : null}

                  <form action={reviewLand}>
                    <input type="hidden" name="land_id" value={land.id} />
                    <input type="hidden" name="status" value="publie" />
                    <Button type="submit" size="sm">
                      Valider et publier
                    </Button>
                  </form>

                  <form action={reviewLand} className="flex items-end gap-2">
                    <input type="hidden" name="land_id" value={land.id} />
                    <input type="hidden" name="status" value="refuse" />
                    <div className="w-64">
                      <Field label="Motif du refus" htmlFor={`reason-${land.id}`}>
                        <input
                          id={`reason-${land.id}`}
                          name="reason"
                          className="champ"
                          placeholder="Dossier incomplet…"
                          required
                        />
                      </Field>
                    </div>
                    <Button type="submit" variant="danger" size="sm">
                      Refuser
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
          Projets participatifs en attente ({pendingProjects.length})
        </h2>

        {pendingProjects.length === 0 ? (
          <EmptyState icon="🏗️" title="Aucun projet en attente" />
        ) : (
          <div className="space-y-4">
            {pendingProjects.map((project) => (
              <Card key={project.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="alerte">{PROJECT_STATUS_LABELS[project.status]}</Badge>
                  {project.reference ? <Badge>{project.reference}</Badge> : null}
                </div>
                <h3 className="mt-2 font-semibold text-encre-900">{project.title}</h3>
                <p className="mt-1 text-sm text-encre-500">
                  {project.units_planned} logements · {project.participants_target} participants
                  recherchés · créé le {formatDate(project.created_at)}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-sable-200 pt-4">
                  {project.status === 'analyse' ? (
                    <form action={reviewProject}>
                      <input type="hidden" name="project_id" value={project.id} />
                      <input type="hidden" name="status" value="validation_admin" />
                      <Button type="submit" variant="secondary" size="sm">
                        Passer en validation
                      </Button>
                    </form>
                  ) : null}
                  <form action={reviewProject}>
                    <input type="hidden" name="project_id" value={project.id} />
                    <input type="hidden" name="status" value="ouvert" />
                    <Button type="submit" variant="collectif" size="sm">
                      Ouvrir aux participants
                    </Button>
                  </form>
                  <form action={reviewProject}>
                    <input type="hidden" name="project_id" value={project.id} />
                    <input type="hidden" name="status" value="annule" />
                    <input type="hidden" name="reason" value="Projet non retenu" />
                    <Button type="submit" variant="danger" size="sm">
                      Rejeter
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
