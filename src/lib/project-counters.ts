/**
 * Compteurs d'un projet participatif.
 *
 * Module volontairement pur — aucune dépendance — pour rester testable seul.
 *
 * Pourquoi il existe : une colonne absente de la vue arrivait `undefined`
 * jusque dans le rendu, où elle s'affichait comme une chaîne vide. La légende
 * d'avancement donnait « / 140 » sans chiffre devant, et la barre calculait
 * `NaN %`. Le cas se produit dès que le code est déployé avant sa migration —
 * une fenêtre qui se rouvre à chaque livraison. Assainir le composant
 * d'affichage ne suffisait pas : la légende lisait la donnée brute. On
 * normalise donc à la lecture, pour que tout affichage parte d'un nombre.
 */

/** Compteur toujours exploitable : absent, non numérique ou négatif -> 0. */
export function toCount(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.floor(parsed))
}

export interface ProjectCounters {
  units_planned: number
  participants_confirmed: number
  participants_pending: number
  units_reserved: number
  units_pending: number
}

/**
 * Ramène les cinq compteurs d'une ligne de `projects_public` à des nombres.
 * `units_*` compte des unités, `participants_*` des personnes : un adhérent
 * peut réserver plusieurs unités, les deux ne se confondent pas.
 */
export function normalizeCounters(row: Partial<Record<keyof ProjectCounters, unknown>>): ProjectCounters {
  return {
    units_planned: toCount(row.units_planned),
    participants_confirmed: toCount(row.participants_confirmed),
    participants_pending: toCount(row.participants_pending),
    units_reserved: toCount(row.units_reserved),
    units_pending: toCount(row.units_pending),
  }
}
