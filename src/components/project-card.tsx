import Link from 'next/link'
import type { Translation } from '@/lib/i18n/server'
import type { ProjectPublic, ProjectStatus } from '@/lib/types'
import { Badge, ProgressBar } from './ui'

const STATUS_TONES: Partial<Record<ProjectStatus, 'zellige' | 'safran' | 'succes' | 'neutre'>> = {
  ouvert: 'zellige',
  groupe_constitue: 'succes',
  en_preparation: 'safran',
  realise: 'succes',
}

export function ProjectCard({ project, tr }: { project: ProjectPublic; tr: Translation }) {
  const { t, f, path } = tr
  const location = [project.city_name, project.region_name].filter(Boolean).join(' — ')

  return (
    <Link
      href={path(`/projets/${project.id}`)}
      className="surface group flex flex-col gap-3 p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONES[project.status] ?? 'neutre'}>
          {t.enums.projectStatus[project.status]}
        </Badge>
        {project.restricted_to_body ? (
          <Badge tone="argile">
            👥 {t.enums.professionalBodyPlural[project.restricted_to_body]}
          </Badge>
        ) : null}
      </div>

      <div>
        <h3 className="font-semibold text-encre-900 group-hover:text-zellige-600">
          🏢 {project.title}
        </h3>
        <p className="mt-1 text-sm text-encre-500">📍 {location}</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <div>
          <dt className="text-xs text-encre-400">{t.projects.typology}</dt>
          <dd className="text-encre-700">{t.enums.propertyNeed[project.property_need]}</dd>
        </div>
        <div>
          <dt className="text-xs text-encre-400">{t.projects.plannedUnits}</dt>
          <dd className="text-encre-700">{project.units_planned}</dd>
        </div>
        {project.budget_per_unit ? (
          <div>
            <dt className="text-xs text-encre-400">{t.projects.budgetPerUnit}</dt>
            <dd className="text-encre-700">{f.dhCompact(project.budget_per_unit)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs text-encre-400">{t.projects.targetParticipants}</dt>
          <dd className="text-encre-700">{project.participants_target}</dd>
        </div>
      </dl>

      <div className="mt-auto pt-1">
        <ProgressBar value={project.participants_confirmed} max={project.participants_target} />
      </div>
    </Link>
  )
}
