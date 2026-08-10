import type { Metadata } from 'next'
import { signOut } from '@/app/actions/auth'
import { updatePassword } from '@/app/actions/profile'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Alert, Button, Card, Field, SectionTitle } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: getDictionary(resolveLocale(locale)).settings.title }
}

export default async function ParametresPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const { t, f } = translation(locale)

  const query = await searchParams
  const session = await requireSession('/parametres')

  return (
    <div>
      <SectionTitle title={t.settings.title} />

      {query.enregistre ? (
        <div className="mb-5">
          <Alert tone="succes">{t.settings.saved}</Alert>
        </div>
      ) : null}
      {query.erreur === 'mot_de_passe' ? (
        <div className="mb-5">
          <Alert tone="danger">{t.settings.passwordError}</Alert>
        </div>
      ) : null}

      <div className="space-y-6">
        <Card>
          <h2 className="font-semibold text-encre-900">{t.settings.account}</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-encre-400">{t.settings.loginAddress}</dt>
              <dd className="ltr-inline text-sm font-medium text-encre-900">
                {session.email ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-encre-400">{t.settings.role}</dt>
              <dd className="text-sm font-medium text-encre-900">
                {t.enums.role[session.profile.role]}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-encre-400">{t.settings.registeredOn}</dt>
              <dd className="text-sm font-medium text-encre-900">
                {f.date(session.profile.created_at)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="font-semibold text-encre-900">{t.settings.language}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-encre-500">
            {t.settings.languageBody}
          </p>
          <div className="mt-4">
            <LanguageSwitcher locale={locale} label={t.meta.switchLabel} />
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-encre-900">{t.settings.changePassword}</h2>
          <form action={updatePassword} className="mt-4 max-w-sm space-y-4">
            <Field label={t.settings.newPassword} htmlFor="password" hint={t.auth.passwordHint} required>
              <input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                className="champ"
              />
            </Field>
            <Button type="submit">{t.settings.update}</Button>
          </form>
        </Card>

        <Card>
          <h2 className="font-semibold text-encre-900">{t.settings.privacyTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-encre-500">{t.settings.privacyBody}</p>
        </Card>

        <Card>
          <h2 className="font-semibold text-encre-900">{t.settings.session}</h2>
          <form action={signOut} className="mt-4">
            <Button type="submit" variant="secondary">
              {t.settings.signOut}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
