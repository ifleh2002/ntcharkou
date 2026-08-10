import type { Metadata } from 'next'
import { Card, LinkButton } from '@/components/ui'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'

const VALUE_ICONS = ['🔍', '🛡️', '🔒']

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: getDictionary(resolveLocale(locale)).about.title }
}

export default async function AProposPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { t, path } = translation(resolveLocale(locale))

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-encre-900">{t.about.title}</h1>

      <div className="mt-6 space-y-5 leading-relaxed text-encre-700">
        {t.about.paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {t.about.values.map((value, index) => (
          <Card key={value.title}>
            <span className="text-2xl" aria-hidden>
              {VALUE_ICONS[index]}
            </span>
            <h2 className="mt-2 font-semibold text-encre-900">{value.title}</h2>
            <p className="mt-1 text-sm text-encre-500">{value.text}</p>
          </Card>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <LinkButton href={path('/comment-ca-marche')} variant="secondary">
          {t.about.ctaHow}
        </LinkButton>
        <LinkButton href={path('/inscription')}>{t.about.ctaSignup}</LinkButton>
      </div>
    </div>
  )
}
