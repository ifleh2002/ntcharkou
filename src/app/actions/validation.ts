import type { ZodError } from 'zod'
import { interpolate } from '@/lib/i18n'
import type { Dictionary } from '@/lib/i18n'

/**
 * Les schémas zod sont définis au niveau du module et ne connaissent donc pas
 * la langue. Plutôt que de dupliquer chaque message, on traduit le nom du champ
 * fautif : la validation côté navigateur couvre déjà le cas courant, ce message
 * n'apparaît qu'en dernier recours.
 */
export function firstIssueMessage(t: Dictionary, error: ZodError, labels: Record<string, string>) {
  const issue = error.issues[0]
  const field = String(issue?.path?.[0] ?? '')
  return interpolate(t.common.invalidField, { field: labels[field] ?? field })
}
