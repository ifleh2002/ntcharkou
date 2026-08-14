import Link from 'next/link'
import type { Dictionary } from '@/lib/i18n'
import { Card } from './ui'

export interface QueueRow {
  kind: string
  total: number
  oldest_days: number
}

export interface CompletenessRow {
  kind: string
  total: number
}

/** Où mène chaque file, et la clé de son libellé. */
const QUEUE: Record<string, { href: string; icon: string }> = {
  terrains_a_valider: { href: '/admin/validations', icon: '✅' },
  projets_a_instruire: { href: '/admin/projets', icon: '🏗️' },
  adhesions_en_attente: { href: '/admin/adhesions', icon: '🤝' },
  signalements_ouverts: { href: '/admin/signalements', icon: '🚩' },
}

const COMPLETENESS: Record<string, { href: string; icon: string }> = {
  terrains_sans_contour: { href: '/admin/terrains', icon: '📐' },
  terrains_sans_photo: { href: '/admin/terrains', icon: '📷' },
  projets_sans_grille: { href: '/admin/projets', icon: '💰' },
  contenus_sans_arabe: { href: '/admin/projets', icon: '🇲🇦' },
}

/**
 * Ce qui attend une décision.
 *
 * L'ancienneté du dossier le plus ancien accompagne chaque compteur : « 3 en
 * attente » ne dit pas si le plus vieux date de ce matin ou de trois semaines,
 * et c'est pourtant ce qui décide de l'ordre de traitement. Au-delà d'une
 * semaine, la file est signalée.
 */
export function ActionQueue({
  rows,
  t,
  path,
}: {
  rows: QueueRow[]
  t: Dictionary
  path: (href: string) => string
}) {
  const pending = rows.filter((row) => row.total > 0)

  return (
    <Card>
      <h2 className="font-semibold text-encre-900">{t.admin.queueTitle}</h2>

      {pending.length === 0 ? (
        <p className="mt-3 text-sm text-encre-500">{t.admin.queueNothingPending}</p>
      ) : (
        <ul className="mt-3 divide-y divide-sable-200">
          {pending.map((row) => {
            const target = QUEUE[row.kind]
            if (!target) return null
            const late = row.oldest_days >= 7

            return (
              <li key={row.kind}>
                <Link
                  href={path(target.href)}
                  className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-sable-100"
                >
                  <span aria-hidden className="text-lg">
                    {target.icon}
                  </span>
                  <span className="flex-1 text-sm text-encre-700">
                    {t.admin.queueLabels[row.kind as keyof typeof t.admin.queueLabels]}
                  </span>
                  {row.oldest_days > 0 ? (
                    <span className={late ? 'text-xs font-semibold text-argile-600' : 'text-xs text-encre-400'}>
                      {late ? '⚠ ' : ''}
                      {row.oldest_days} {t.admin.queueDays}
                    </span>
                  ) : null}
                  <span className="grid min-w-7 place-items-center rounded-full bg-argile-500 px-2 py-0.5 text-sm font-bold text-white">
                    {row.total}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/**
 * Ce qui est publié mais incomplet.
 *
 * Aucun de ces cas ne remonte comme une erreur : un projet sans grille
 * tarifaire s'affiche simplement sans prix, un terrain sans contour n'apparaît
 * pas sur la carte. Il faut donc les chercher — ou les afficher.
 */
export function CompletenessPanel({
  rows,
  t,
  path,
}: {
  rows: CompletenessRow[]
  t: Dictionary
  path: (href: string) => string
}) {
  const gaps = rows.filter((row) => row.total > 0)

  return (
    <Card>
      <h2 className="font-semibold text-encre-900">{t.admin.completenessTitle}</h2>
      <p className="mt-1 text-xs text-encre-400">{t.admin.completenessLead}</p>

      {gaps.length === 0 ? (
        <p className="mt-3 text-sm text-zellige-600">✓ {t.admin.completenessAllGood}</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {gaps.map((row) => {
            const target = COMPLETENESS[row.kind]
            if (!target) return null

            return (
              <li key={row.kind}>
                <Link
                  href={path(target.href)}
                  className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-sable-100"
                >
                  <span aria-hidden>{target.icon}</span>
                  <span className="flex-1 text-encre-700">
                    {t.admin.completenessLabels[row.kind as keyof typeof t.admin.completenessLabels]}
                  </span>
                  <span className="font-semibold text-encre-900">{row.total}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
