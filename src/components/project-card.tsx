import Link from 'next/link'
import type { Translation } from '@/lib/i18n/server'
import { projectImageUrl } from '@/lib/storage'
import type { ProjectPublic, ProjectStatus } from '@/lib/types'
import { Cover } from './cover'
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
      className="surface group flex flex-col overflow-hidden p-0 transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-16/9 bg-sable-200">
        <Cover
          src={projectImageUrl(project.cover_image_path)}
          alt={project.title}
          seed={project.id}
          icon="🏢"
        />
        <div className="absolute top-3 start-3 flex flex-wrap gap-1.5">
          <Badge tone={STATUS_TONES[project.status] ?? 'neutre'}>
            {t.enums.projectStatus[project.status]}
          </Badge>
          {project.restricted_to_body ? (
            <Badge tone="argile">
              👥 {t.enums.professionalBodyPlural[project.restricted_to_body]}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-semibold text-encre-900 group-hover:text-zellige-600">
            {project.title}
          </h3>
          <p className="mt-1 text-sm text-encre-500">📍 {location}</p>
        </div>

        <PriceComparison project={project} tr={tr} />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <div>
            <dt className="text-xs text-encre-400">{t.projects.typology}</dt>
            <dd className="text-encre-700">{t.enums.propertyNeed[project.property_need]}</dd>
          </div>
          {project.unit_surface_m2 ? (
            <div>
              <dt className="text-xs text-encre-400">{t.projects.unitSurface}</dt>
              <dd className="text-encre-700">{f.surface(project.unit_surface_m2)}</dd>
            </div>
          ) : null}
        </dl>

        {/* Avancement mesure sur le nombre total d'unites du projet. */}
        <div className="mt-auto pt-1">
          <ProgressBar value={project.participants_confirmed} max={project.units_planned} />
          <p className="mt-1.5 text-xs text-encre-500">
            <span className="font-semibold text-encre-900">
              {project.participants_confirmed} / {project.units_planned}
            </span>{' '}
            {t.projects.unitsTaken}
          </p>
        </div>
      </div>
    </Link>
  )
}

/**
 * Prix participatif face au prix du marche.
 * N'apparait que si l'administration a saisi les deux grilles : un comparatif
 * incomplet induirait en erreur.
 */
export function PriceComparison({
  project,
  tr,
  size = 'sm',
}: {
  project: ProjectPublic
  tr: Translation
  size?: 'sm' | 'lg'
}) {
  const { t, f } = tr
  if (!project.unit_price) return null

  const hasMarket = Boolean(project.market_unit_price && project.savings_percent)

  return (
    <div className="rounded-lg border border-zellige-200 bg-zellige-50 p-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={
            size === 'lg'
              ? 'text-2xl font-bold text-zellige-600'
              : 'text-lg font-bold text-zellige-600'
          }
        >
          {f.dhCompact(project.unit_price)}
        </span>
        <span className="text-xs text-encre-500">{t.projects.perUnit}</span>
      </div>

      {hasMarket ? (
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs text-encre-500">
          <span className="line-through">{f.dhCompact(project.market_unit_price)}</span>
          <span>{t.projects.marketPrice}</span>
          <span className="font-semibold text-zellige-600">
            −{f.percent(project.savings_percent)}
          </span>
        </p>
      ) : null}

      {project.unit_price_per_m2 ? (
        <p className="mt-1 text-xs text-encre-400">
          {f.dh(project.unit_price_per_m2)}/{f.sqm}
          {project.market_price_per_m2
            ? ` · ${t.projects.marketPrice} ${f.dh(project.market_price_per_m2)}/${f.sqm}`
            : ''}
        </p>
      ) : null}
    </div>
  )
}
