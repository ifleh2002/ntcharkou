import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LOCALES, LOCALE_META, getDictionary, isLocale } from '@/lib/i18n'
import '../globals.css'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = getDictionary(isLocale(locale) ? locale : 'fr')
  return {
    title: { default: t.meta.title, template: t.meta.titleTemplate },
    description: t.meta.description,
    alternates: {
      languages: Object.fromEntries(
        LOCALES.map((code) => [LOCALE_META[code].htmlLang, `/${code}`]),
      ),
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const meta = LOCALE_META[locale]

  return (
    <html lang={meta.htmlLang} dir={meta.dir}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
