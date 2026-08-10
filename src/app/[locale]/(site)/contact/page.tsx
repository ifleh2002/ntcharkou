import type { Metadata } from 'next'
import { reportListing } from '@/app/actions/interactions'
import { Alert, Button, Card, Field } from '@/components/ui'
import { getSessionContext } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import type { ReportReason } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: getDictionary(resolveLocale(locale)).contact.title }
}

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const query = await searchParams
  const { t } = translation(resolveLocale(locale))

  const landId = typeof query.terrain === 'string' ? query.terrain : null
  const session = await getSessionContext()

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-encre-900">{t.contact.title}</h1>
      <p className="mt-2 text-encre-500">{t.contact.lead}</p>

      {query.signalement ? (
        <div className="mt-6">
          <Alert tone="succes" title={t.contact.reportSent}>
            {t.contact.reportSentBody}
          </Alert>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-encre-900">{t.contact.teamTitle}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-encre-400">{t.contact.email}</dt>
              <dd className="ltr-inline font-medium text-encre-900">contact@ntcharkou.ma</dd>
            </div>
            <div>
              <dt className="text-encre-400">{t.contact.phone}</dt>
              <dd className="ltr-inline font-medium text-encre-900">+212 5 22 00 00 00</dd>
            </div>
            <div>
              <dt className="text-encre-400">{t.contact.hours}</dt>
              <dd className="font-medium text-encre-900">{t.contact.hoursValue}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-encre-400">{t.contact.teamNote}</p>
        </Card>

        <Card>
          <h2 className="font-semibold text-encre-900">
            {landId ? t.contact.reportTitleWithLand : t.contact.reportTitle}
          </h2>
          {session ? (
            <form action={reportListing} className="mt-4 space-y-4">
              <input type="hidden" name="land_id" value={landId ?? ''} />
              <input type="hidden" name="return_to" value="/contact" />

              <Field label={t.contact.reportReason} htmlFor="reason" required>
                <select id="reason" name="reason" className="champ" required defaultValue="">
                  <option value="" disabled>
                    {t.contact.reportChoose}
                  </option>
                  {(Object.keys(t.enums.reportReason) as ReportReason[]).map((key) => (
                    <option key={key} value={key}>
                      {t.enums.reportReason[key]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t.contact.reportDetails} htmlFor="details">
                <textarea id="details" name="details" rows={4} className="champ" />
              </Field>

              <Button type="submit" variant="secondary" className="w-full" disabled={!landId}>
                {landId ? t.contact.reportSubmit : t.contact.reportNeedLand}
              </Button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-encre-500">{t.contact.reportLoginRequired}</p>
          )}
        </Card>
      </div>
    </div>
  )
}
