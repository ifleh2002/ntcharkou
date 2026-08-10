import type { Dictionary } from './i18n/dictionaries/fr'
import { interpolate, type Locale } from './i18n'

/**
 * Les montants et surfaces gardent les chiffres « arabes occidentaux »
 * (1, 2, 3) dans les deux langues : c'est l'usage au Maroc, y compris dans les
 * documents en arabe. D'où le suffixe `-u-nu-latn` sur la locale arabe.
 */
const INTL_LOCALE: Record<Locale, string> = {
  fr: 'fr-MA',
  ar: 'ar-MA-u-nu-latn',
}

export type ScoreTone = 'excellent' | 'bon' | 'moyen' | 'faible'

/** Qualification d'un score de matching (section 22 du cahier des charges). */
export function scoreTone(score: number): ScoreTone {
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'bon'
  if (score >= 60) return 'moyen'
  return 'faible'
}

export function createFormatter(locale: Locale, t: Dictionary) {
  const intl = INTL_LOCALE[locale]
  const numbers = new Intl.NumberFormat(intl, { maximumFractionDigits: 0 })
  const dates = new Intl.DateTimeFormat(intl, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const currency = locale === 'ar' ? 'درهم' : 'DH'
  const sqm = locale === 'ar' ? 'م²' : 'm²'

  function number(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—'
    return numbers.format(value)
  }

  function dh(value: number | null | undefined): string {
    if (value === null || value === undefined) return t.common.priceNotProvided
    return `${numbers.format(Math.round(value))} ${currency}`
  }

  function dhCompact(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—'
    if (Math.abs(value) >= 1_000_000) {
      const millions = (value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)
      return `${locale === 'fr' ? millions.replace('.', ',') : millions} M ${currency}`
    }
    if (Math.abs(value) >= 1_000) {
      return `${Math.round(value / 1_000)} k ${currency}`
    }
    return `${numbers.format(value)} ${currency}`
  }

  function surface(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—'
    return `${numbers.format(value)} ${sqm}`
  }

  function percent(value: number | null | undefined, decimals = 0): string {
    if (value === null || value === undefined) return '—'
    const text = value.toFixed(decimals)
    return `${locale === 'fr' ? text.replace('.', ',') : text} %`
  }

  function date(value: string | null | undefined): string {
    if (!value) return '—'
    return dates.format(new Date(value))
  }

  function relative(value: string | null | undefined): string {
    if (!value) return '—'
    const diff = Date.now() - new Date(value).getTime()
    const minutes = Math.round(diff / 60000)
    if (minutes < 1) return t.time.justNow
    if (minutes < 60) return interpolate(t.time.minutesAgo, { n: minutes })
    const hours = Math.round(minutes / 60)
    if (hours < 24) return interpolate(t.time.hoursAgo, { n: hours })
    const days = Math.round(hours / 24)
    if (days < 31) return interpolate(t.time.daysAgo, { n: days })
    return date(value)
  }

  /** Libellé du score, dans la langue courante. */
  function scoreLabel(score: number): string {
    const tone = scoreTone(score)
    return {
      excellent: t.score.excellent,
      bon: t.score.good,
      moyen: t.score.fair,
      faible: t.score.low,
    }[tone]
  }

  return { number, dh, dhCompact, surface, percent, date, relative, scoreLabel, currency, sqm }
}

export type Formatter = ReturnType<typeof createFormatter>
