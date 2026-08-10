import type { Metadata } from 'next'
import { Card, LinkButton, SectionTitle } from '@/components/ui'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { CRITERION_WEIGHTS } from '@/lib/labels'

const SCORE_SCALE = [
  { range: '90 – 100 %', dot: '🟢', key: 'excellent' },
  { range: '75 – 89 %', dot: '🟢', key: 'good' },
  { range: '60 – 74 %', dot: '🟠', key: 'fair' },
  { range: '< 60 %', dot: '⚪', key: 'low' },
] as const

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = getDictionary(resolveLocale(locale))
  return { title: t.howItWorks.title, description: t.howItWorks.lead }
}

export default async function CommentCaMarchePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const { t, path } = translation(resolveLocale(locale))

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold text-encre-900">{t.howItWorks.title}</h1>
        <p className="mt-3 leading-relaxed text-encre-500">{t.howItWorks.lead}</p>
      </header>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold text-encre-900">🏞️ {t.howItWorks.ownerTitle}</h2>
          <ol className="mt-4 space-y-3">
            {t.howItWorks.ownerSteps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm text-encre-700">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-argile-100 text-xs font-bold text-argile-700">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <LinkButton href={path('/mes-terrains/nouveau')} size="sm" className="mt-5">
            {t.howItWorks.ownerCta}
          </LinkButton>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-encre-900">👥 {t.howItWorks.participantTitle}</h2>
          <ol className="mt-4 space-y-3">
            {t.howItWorks.participantSteps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm text-encre-700">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-zellige-100 text-xs font-bold text-zellige-700">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <LinkButton
            href={path('/mes-demandes/nouvelle')}
            variant="collectif"
            size="sm"
            className="mt-5"
          >
            {t.howItWorks.participantCta}
          </LinkButton>
        </Card>
      </section>

      {/* --- Le moteur de matching ---------------------------------------- */}
      <section className="mt-14">
        <SectionTitle title={t.howItWorks.engineTitle} subtitle={t.howItWorks.engineSubtitle} />

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <Card>
            <h3 className="font-semibold text-encre-900">{t.howItWorks.weightsTitle}</h3>
            <ul className="mt-4 space-y-2.5">
              {CRITERION_WEIGHTS.map((item) => (
                <li key={item.key} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-sm text-encre-700">
                    {t.enums.criterion[item.key]}
                  </span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-sable-300">
                    <span
                      className="block h-full rounded-full bg-argile-400"
                      style={{ width: `${item.weight * 5}%` }}
                    />
                  </span>
                  <span className="w-12 shrink-0 text-end text-sm font-semibold text-encre-900">
                    {item.weight} %
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-encre-400">
              {t.howItWorks.weightsNote}
            </p>
          </Card>

          <div className="space-y-4">
            <Card>
              <h3 className="font-semibold text-encre-900">{t.howItWorks.scaleTitle}</h3>
              <ul className="mt-3 space-y-2">
                {SCORE_SCALE.map((item) => (
                  <li key={item.range} className="flex items-center gap-2 text-sm">
                    <span aria-hidden>{item.dot}</span>
                    <span className="font-medium text-encre-900">{item.range}</span>
                    <span className="text-encre-500">— {t.score[item.key]}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <h3 className="font-semibold text-encre-900">{t.howItWorks.exampleTitle}</h3>
              <p className="mt-2 text-sm text-encre-500">{t.howItWorks.exampleText}</p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-sm font-semibold text-white">
                {t.howItWorks.exampleScore}
              </p>
              <p className="mt-3 text-sm text-encre-500">{t.howItWorks.exampleFooter}</p>
            </Card>
          </div>
        </div>
      </section>

      {/* --- Validation --------------------------------------------------- */}
      <section className="mt-14">
        <SectionTitle
          title={t.howItWorks.validationTitle}
          subtitle={t.howItWorks.validationSubtitle}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <h3 className="font-semibold text-encre-900">{t.howItWorks.validationLand}</h3>
            <p className="mt-3 text-sm leading-relaxed text-encre-700">
              {t.howItWorks.validationLandFlow}
              <br />
              <span className="text-encre-400">{t.howItWorks.validationLandNote}</span>
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold text-encre-900">{t.howItWorks.validationProject}</h3>
            <p className="mt-3 text-sm leading-relaxed text-encre-700">
              {t.howItWorks.validationProjectFlow}
            </p>
          </Card>
        </div>
      </section>

      <section className="mt-14">
        <Card className="bg-zellige-500 text-white">
          <h2 className="text-xl font-bold">{t.howItWorks.privacyTitle}</h2>
          <p className="mt-2 max-w-3xl leading-relaxed text-zellige-50/90">
            {t.howItWorks.privacyText}
          </p>
        </Card>
      </section>
    </div>
  )
}
