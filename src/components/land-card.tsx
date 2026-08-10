import Link from 'next/link'
import type { Translation } from '@/lib/i18n/server'
import { landImageUrl } from '@/lib/storage'
import type { LandListingPublic } from '@/lib/types'
import { ScoreBadge } from './score'
import { Badge } from './ui'

export function LandCard({
  land,
  tr,
  score,
  href,
}: {
  land: LandListingPublic
  tr: Translation
  score?: number | null
  href?: string
}) {
  const { t, f, path } = tr
  const cover = landImageUrl(land.cover_image_path)
  const location = [land.district, land.city_name, land.region_name].filter(Boolean).join(' — ')

  return (
    <Link
      href={href ?? path(`/terrains/${land.id}`)}
      className="surface group flex flex-col overflow-hidden p-0 transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-16/10 overflow-hidden bg-sable-200">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={land.title}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="motif-zellige flex size-full items-center justify-center text-4xl">🏞️</div>
        )}
        <div className="absolute top-3 start-3 flex flex-wrap gap-1.5">
          <Badge tone="argile">{t.enums.zoning[land.zoning]}</Badge>
          {land.price_negotiable ? <Badge tone="safran">{t.lands.negotiable}</Badge> : null}
        </div>
        {typeof score === 'number' ? (
          <div className="absolute top-3 end-3">
            <ScoreBadge score={score} tr={tr} withLabel={false} size="sm" />
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-semibold text-encre-900">{land.title}</h3>
        <p className="line-clamp-1 text-sm text-encre-500">📍 {location || land.region_name}</p>

        <div className="mt-auto flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-2">
          <span className="text-lg font-bold text-argile-600">{f.dhCompact(land.total_price)}</span>
          {land.price_per_m2 ? (
            <span className="text-sm text-encre-500">
              {f.dh(land.price_per_m2)}/{f.sqm}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-encre-500">
          <span>{f.surface(land.surface_m2)}</span>
          {land.estimated_units ? (
            <span>
              ≈ {land.estimated_units} {t.lands.estimatedUnits}
            </span>
          ) : null}
          <span className="ms-auto flex gap-1" aria-label={t.lands.networksLabel}>
            {land.has_water ? <span title={t.enums.network.water}>💧</span> : null}
            {land.has_electricity ? <span title={t.enums.network.electricity}>⚡</span> : null}
            {land.has_sewage ? <span title={t.enums.network.sewage}>🚰</span> : null}
          </span>
        </div>
      </div>
    </Link>
  )
}
