import { cookies, headers } from 'next/headers'
import { createFormatter, type Formatter } from '../format'
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isLocale,
  localePath,
  type Locale,
} from './config'
import { getDictionary, type Dictionary } from './index'

/**
 * Langue de la requête courante, pour les composants serveur partagés
 * (en-tête, pied de page) qui ne reçoivent pas `params`.
 * Les pages, elles, lisent `params.locale` : c'est la source faisant foi.
 */
export async function getRequestLocale(): Promise<Locale> {
  const store = await headers()
  const value = store.get(LOCALE_HEADER)
  return isLocale(value) ? value : DEFAULT_LOCALE
}

export interface Translation {
  locale: Locale
  /** Dictionnaire de la langue courante. */
  t: Dictionary
  /** Préfixe un chemin applicatif par la langue courante. */
  path: (path: string) => string
  /** Formateurs (montants, dates, pourcentages) accordés à la langue. */
  f: Formatter
}

/** Variante synchrone, quand la langue vient de `params.locale`. */
export function translation(locale: Locale): Translation {
  const t = getDictionary(locale)
  return {
    locale,
    t,
    path: (path: string) => localePath(locale, path),
    f: createFormatter(locale, t),
  }
}

/** Variante asynchrone, pour les composants sans `params`. */
export async function getTranslation(): Promise<Translation> {
  return translation(await getRequestLocale())
}

/** Normalise le paramètre de route, qui arrive sous forme de chaîne libre. */
export function resolveLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE
}

/**
 * Langue d'une Server Action. Les actions ne reçoivent ni `params` ni les
 * en-têtes de la navigation : on s'appuie sur le cookie, que le middleware
 * repose à chaque requête.
 */
export async function getActionTranslation(): Promise<Translation> {
  const store = await cookies()
  const value = store.get(LOCALE_COOKIE)?.value
  return translation(isLocale(value) ? value : DEFAULT_LOCALE)
}
