'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { LOCALES, LOCALE_META, localePath, stripLocale, type Locale } from '@/lib/i18n/config'
import { cx } from './ui'

/**
 * Bascule FR / AR. On reste sur la même page : seul le préfixe de langue
 * change, les chemins étant identiques dans les deux langues.
 */
export function LanguageSwitcher({
  locale,
  label,
  variant = 'light',
}: {
  locale: Locale
  label: string
  variant?: 'light' | 'dark'
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { path } = stripLocale(pathname)
  const query = searchParams.toString()

  function switchTo(target: Locale) {
    if (target === locale) return
    const next = localePath(target, path) + (query ? `?${query}` : '')
    router.push(next)
    router.refresh()
  }

  return (
    <div
      role="group"
      aria-label={label}
      className={cx(
        'inline-flex items-center rounded-lg border p-0.5',
        variant === 'dark' ? 'border-white/20' : 'border-sable-400 bg-white',
      )}
    >
      {LOCALES.map((code) => {
        const active = code === locale
        return (
          <button
            key={code}
            type="button"
            lang={LOCALE_META[code].htmlLang}
            onClick={() => switchTo(code)}
            aria-current={active ? 'true' : undefined}
            className={cx(
              'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
              active
                ? variant === 'dark'
                  ? 'bg-white/20 text-white'
                  : 'bg-argile-500 text-white'
                : variant === 'dark'
                  ? 'text-white/60 hover:text-white'
                  : 'text-encre-500 hover:text-encre-900',
            )}
          >
            {code === 'ar' ? 'ع' : 'FR'}
          </button>
        )
      })}
    </div>
  )
}
