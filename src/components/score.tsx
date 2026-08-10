import { CRITERION_LABELS } from '@/lib/labels'
import { scoreLabel } from '@/lib/format'
import type { MatchBreakdown } from '@/lib/types'
import { cx } from './ui'

const TONE_STYLES = {
  excellent: 'bg-emerald-600 text-white',
  bon: 'bg-zellige-500 text-white',
  moyen: 'bg-safran-400 text-encre-900',
  faible: 'bg-sable-300 text-encre-700',
} as const

/** Pastille « 92 % — Excellent match » (section 22). */
export function ScoreBadge({
  score,
  withLabel = true,
  size = 'md',
}: {
  score: number
  withLabel?: boolean
  size?: 'sm' | 'md'
}) {
  const { label, tone } = scoreLabel(score)
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        TONE_STYLES[tone],
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      )}
      title={label}
    >
      <span>{Math.round(score)} %</span>
      {withLabel ? <span className="font-medium opacity-90">{label}</span> : null}
    </span>
  )
}

/** Detail du score critere par critere — rend la formule lisible pour l'usager. */
export function ScoreBreakdown({ breakdown }: { breakdown: MatchBreakdown }) {
  const entries = Object.entries(breakdown) as [keyof MatchBreakdown, MatchBreakdown[keyof MatchBreakdown]][]
  if (entries.length === 0) return null

  return (
    <ul className="space-y-2">
      {entries.map(([key, criterion]) => {
        if (!criterion) return null
        const pct = Math.round(criterion.score * 100)
        return (
          <li key={key} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-sm text-encre-700">
              {CRITERION_LABELS[key] ?? key}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-sable-300">
              <span
                className={cx(
                  'block h-full rounded-full',
                  pct >= 75 ? 'bg-zellige-500' : pct >= 40 ? 'bg-safran-400' : 'bg-argile-300',
                )}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="w-24 shrink-0 text-right text-xs font-medium text-encre-500">
              {criterion.points} / {criterion.weight} pts
            </span>
          </li>
        )
      })}
    </ul>
  )
}
