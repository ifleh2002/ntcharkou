import { cx } from './ui'

export interface Datum {
  label: string
  value: number
  hint?: string
}

/** Barres horizontales — lisible même avec des libellés longs (régions, typologies). */
export function BarList({
  data,
  emptyLabel,
  tone = 'argile',
  formatValue = (value: number) => String(value),
}: {
  data: Datum[]
  emptyLabel: string
  tone?: 'argile' | 'zellige'
  formatValue?: (value: number) => string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-encre-400">{emptyLabel}</p>
  }

  return (
    <ul className="space-y-2.5">
      {data.map((datum) => (
        <li key={datum.label} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-sm text-encre-700" title={datum.label}>
            {datum.label}
          </span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-sable-200">
            <span
              className={cx(
                'block h-full rounded-full',
                tone === 'argile' ? 'bg-argile-400' : 'bg-zellige-400',
              )}
              style={{ width: `${(datum.value / max) * 100}%` }}
            />
          </span>
          <span className="w-16 shrink-0 text-end text-sm font-semibold text-encre-900">
            {formatValue(datum.value)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export interface SeriesPoint {
  label: string
  values: number[]
}

/**
 * Courbe d'évolution en SVG pur — pas de dépendance de graphes pour deux séries.
 */
export function LineChart({
  points,
  seriesLabels,
  emptyLabel,
  height = 180,
}: {
  points: SeriesPoint[]
  seriesLabels: string[]
  emptyLabel: string
  height?: number
}) {
  if (points.length === 0) {
    return <p className="py-6 text-center text-sm text-encre-400">{emptyLabel}</p>
  }

  const seriesCount = seriesLabels.length
  const max = Math.max(1, ...points.flatMap((p) => p.values))
  const width = 600
  const padding = { top: 12, right: 12, bottom: 26, left: 32 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const x = (index: number) =>
    padding.left + (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW)
  const y = (value: number) => padding.top + innerH - (value / max) * innerH

  const colors = ['var(--color-argile-500)', 'var(--color-zellige-500)']

  return (
    <div className="chart-ltr overflow-x-auto" dir="ltr">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[420px]"
        role="img"
        aria-label={seriesLabels.join(', ')}
      >
        {[0, 0.5, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={padding.top + innerH * ratio}
              y2={padding.top + innerH * ratio}
              stroke="var(--color-sable-300)"
              strokeWidth="1"
            />
            <text
              x={padding.left - 6}
              y={padding.top + innerH * ratio + 4}
              textAnchor="end"
              fontSize="10"
              fill="var(--color-encre-400)"
            >
              {Math.round(max * (1 - ratio))}
            </text>
          </g>
        ))}

        {Array.from({ length: seriesCount }).map((_, seriesIndex) => {
          const path = points
            .map(
              (point, index) =>
                `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(point.values[seriesIndex] ?? 0).toFixed(1)}`,
            )
            .join(' ')
          return (
            <g key={seriesIndex}>
              <path d={path} fill="none" stroke={colors[seriesIndex % colors.length]} strokeWidth="2.5" />
              {points.map((point, index) => (
                <circle
                  key={point.label}
                  cx={x(index)}
                  cy={y(point.values[seriesIndex] ?? 0)}
                  r="3"
                  fill={colors[seriesIndex % colors.length]}
                />
              ))}
            </g>
          )
        })}

        {points.map((point, index) =>
          index % Math.ceil(points.length / 6) === 0 || index === points.length - 1 ? (
            <text
              key={point.label}
              x={x(index)}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fill="var(--color-encre-400)"
            >
              {point.label}
            </text>
          ) : null,
        )}
      </svg>

      <ul className="mt-2 flex flex-wrap gap-4">
        {seriesLabels.map((label, index) => (
          <li key={label} className="flex items-center gap-1.5 text-xs text-encre-500">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Répartition en segments empilés (qualité des scores de matching). */
export function SegmentBar({
  segments,
  emptyLabel,
}: {
  segments: { label: string; value: number; color: string }[]
  emptyLabel: string
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  if (total === 0) {
    return <p className="py-4 text-center text-sm text-encre-400">{emptyLabel}</p>
  }

  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full">
        {segments.map((segment) => (
          <span
            key={segment.label}
            className={segment.color}
            style={{ width: `${(segment.value / total) * 100}%` }}
            title={`${segment.label} : ${segment.value}`}
          />
        ))}
      </div>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2 text-sm">
            <span className={cx('size-2.5 rounded-full', segment.color)} />
            <span className="flex-1 text-encre-700">{segment.label}</span>
            <span className="font-semibold text-encre-900">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
