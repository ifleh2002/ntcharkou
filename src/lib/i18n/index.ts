import { ar } from './dictionaries/ar'
import { fr, type Dictionary } from './dictionaries/fr'
import { DEFAULT_LOCALE, type Locale } from './config'

export * from './config'
export type { Dictionary }

const DICTIONARIES: Record<Locale, Dictionary> = { fr, ar }

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE]
}

/** Interpolation minimale : `t.time.minutesAgo` contient « {n} ». */
export function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  )
}
