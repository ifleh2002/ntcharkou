import type { Dictionary } from '@/lib/i18n'
import type { SchemaGap } from '@/lib/schema-check'
import { Alert } from './ui'

/**
 * Signale une migration déployée dans le code mais pas appliquée à la base.
 *
 * Sans ce bandeau, l'écart est muet : la colonne manquante vaut 0, et 0 est un
 * chiffre plausible. L'administration cherche alors la cause du mauvais côté —
 * la donnée semble perdue alors que c'est le schéma qui est en retard.
 */
export function SchemaGapAlert({ gaps, t }: { gaps: SchemaGap[]; t: Dictionary }) {
  if (gaps.length === 0) return null

  return (
    <div className="mb-5">
      <Alert tone="danger" title={t.adminProjects.schemaGapTitle}>
        <p>{t.adminProjects.schemaGapBody}</p>
        <ul className="mt-2 space-y-1">
          {gaps.map((gap) => (
            <li key={gap.column}>
              <code className="ltr-inline rounded bg-white/60 px-1.5 py-0.5 text-xs">
                supabase/migrations/{gap.migration}
              </code>{' '}
              <span className="text-xs">({t.adminProjects.schemaGapColumn} {gap.column})</span>
            </li>
          ))}
        </ul>
      </Alert>
    </div>
  )
}
