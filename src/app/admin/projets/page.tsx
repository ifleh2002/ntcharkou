import type { Metadata } from 'next'
import Link from 'next/link'
import { reviewProject } from '@/app/actions/admin'
import { Badge, Button, Card, ProgressBar } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { formatDate, formatDhCompact } from '@/lib/format'
import {
  PROFESSIONAL_BODY_PLURAL,
  PROJECT_STATUS_LABELS,
  PROPERTY_NEED_LABELS,
} from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ProjectPublic, ProjectStatus } from '@/lib/types'

export const metadata: Metadata = { title: 'Projets — Administration' }

const NEXT_STATUS: Partial<Record<ProjectStatus, { status: ProjectStatus; label: string }>> = {
  proposition: { status: 'analyse', label: 'Passer en analyse' },
  analyse: { status: 'validation_admin', label: 'Passer en validation' },
  validation_admin: { status: 'ouvert', label: 'Ouvrir aux participants' },
  groupe_constitue: { status: 'en_preparation', label: 'Passer en préparation' },
  en_preparation: { status: 'realise', label: 'Marquer comme réalisé' },
}

export default async function AdminProjetsPage() {
  await requireAdmin()
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('projects_public')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
    .returns<ProjectPublic[]>()

  const projects = data ?? []

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-encre-900">Projets participatifs</h1>
        <p className="mt-1 text-sm text-encre-500">{projects.length} projets</p>
      </header>

      <div className="space-y-4">
        {projects.map((project) => {
          const next = NEXT_STATUS[project.status]
          return (
            <Card key={project.id} className="flex flex-wrap items-start gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={project.status === 'ouvert' ? 'zellige' : 'neutre'}>
                    {PROJECT_STATUS_LABELS[project.status]}
                  </Badge>
                  {project.restricted_to_body ? (
                    <Badge tone="argile">
                      👥 {PROFESSIONAL_BODY_PLURAL[project.restricted_to_body]}
                    </Badge>
                  ) : null}
                  {project.reference ? <Badge>{project.reference}</Badge> : null}
                </div>
                <h2 className="mt-2 font-semibold text-encre-900">
                  <Link href={`/projets/${project.id}`} className="hover:text-zellige-600">
                    {project.title}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-encre-500">
                  {[project.city_name, project.region_name].filter(Boolean).join(' — ')} ·{' '}
                  {PROPERTY_NEED_LABELS[project.property_need]} · {project.units_planned} logements ·{' '}
                  {formatDhCompact(project.budget_per_unit)} / logement · créé le{' '}
                  {formatDate(project.created_at)}
                </p>
                <div className="mt-3 max-w-xs">
                  <ProgressBar
                    value={project.participants_confirmed}
                    max={project.participants_target}
                  />
                </div>
                {project.participants_pending > 0 ? (
                  <p className="mt-1 text-xs text-encre-400">
                    {project.participants_pending} candidature
                    {project.participants_pending > 1 ? 's' : ''} en attente
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-col gap-2">
                {next ? (
                  <form action={reviewProject}>
                    <input type="hidden" name="project_id" value={project.id} />
                    <input type="hidden" name="status" value={next.status} />
                    <Button type="submit" variant="collectif" size="sm" className="w-full">
                      {next.label}
                    </Button>
                  </form>
                ) : null}
                {project.status !== 'annule' && project.status !== 'realise' ? (
                  <form action={reviewProject}>
                    <input type="hidden" name="project_id" value={project.id} />
                    <input type="hidden" name="status" value="annule" />
                    <input type="hidden" name="reason" value="Annulé par l’administration" />
                    <Button type="submit" variant="danger" size="sm" className="w-full">
                      Annuler
                    </Button>
                  </form>
                ) : null}
              </div>
            </Card>
          )
        })}

        {projects.length === 0 ? (
          <Card className="py-10 text-center text-encre-400">Aucun projet enregistré.</Card>
        ) : null}
      </div>
    </div>
  )
}
