export const LOCALES = ['fr', 'ar'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'fr'

/** En-tête posé par le middleware pour transmettre la langue aux composants. */
export const LOCALE_HEADER = 'x-ntcharkou-locale'

/** Cookie mémorisant la langue choisie, lu par le middleware. */
export const LOCALE_COOKIE = 'ntcharkou_lang'

export const LOCALE_META: Record<Locale, { label: string; dir: 'ltr' | 'rtl'; htmlLang: string }> = {
  fr: { label: 'Français', dir: 'ltr', htmlLang: 'fr' },
  ar: { label: 'العربية', dir: 'rtl', htmlLang: 'ar' },
}

export function isLocale(value: string | undefined | null): value is Locale {
  return LOCALES.includes(value as Locale)
}

export function localeDir(locale: Locale) {
  return LOCALE_META[locale].dir
}

export function isRtl(locale: Locale) {
  return LOCALE_META[locale].dir === 'rtl'
}

/**
 * Préfixe un chemin applicatif par la langue courante.
 * `path` est toujours écrit en français dans le code (`/terrains`) : les URL
 * restent lisibles et une seule arborescence de routes est maintenue.
 */
export function localePath(locale: Locale, path: string): string {
  if (!path.startsWith('/')) return path
  if (path === '/') return `/${locale}`
  return `/${locale}${path}`
}

/** Retire le préfixe de langue d'un chemin (`/ar/terrains` -> `/terrains`). */
export function stripLocale(pathname: string): { locale: Locale | null; path: string } {
  const segments = pathname.split('/')
  const candidate = segments[1]
  if (isLocale(candidate)) {
    const rest = `/${segments.slice(2).join('/')}`
    return { locale: candidate, path: rest === '/' ? '/' : rest.replace(/\/$/, '') || '/' }
  }
  return { locale: null, path: pathname }
}

/** Langue préférée d'après l'en-tête Accept-Language. */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE
  const preferred = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=')
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)

  for (const entry of preferred) {
    if (entry.tag.startsWith('ar')) return 'ar'
    if (entry.tag.startsWith('fr')) return 'fr'
  }
  return DEFAULT_LOCALE
}
