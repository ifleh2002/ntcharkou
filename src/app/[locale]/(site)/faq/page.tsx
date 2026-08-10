import type { Metadata } from 'next'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: getDictionary(resolveLocale(locale)).faq.title }
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { t } = translation(resolveLocale(locale))

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-encre-900">{t.faq.title}</h1>
      <p className="mt-2 text-encre-500">{t.faq.subtitle}</p>

      <div className="mt-8 space-y-3">
        {t.faq.items.map((item) => (
          <details key={item.q} className="surface group p-0">
            <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-encre-900 marker:hidden">
              <span className="me-2 text-argile-500 group-open:hidden">+</span>
              <span className="me-2 hidden text-argile-500 group-open:inline">−</span>
              {item.q}
            </summary>
            <p className="px-5 pb-4 text-sm leading-relaxed text-encre-500">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
