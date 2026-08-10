import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SignupForm } from '@/components/auth-forms'
import { getSessionContext } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: getDictionary(resolveLocale(locale)).auth.signupTitle }
}

export default async function InscriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const query = await searchParams
  const { t, path } = translation(resolveLocale(locale))

  const session = await getSessionContext()
  if (session) redirect(path('/tableau-de-bord'))

  const defaultRole = query.role === 'owner' ? 'owner' : 'participant'

  return (
    <div className="mx-auto flex max-w-lg flex-col px-4 py-14">
      <h1 className="text-3xl font-bold text-encre-900">{t.auth.signupTitle}</h1>
      <p className="mt-2 text-encre-500">{t.auth.signupLead}</p>

      <div className="surface mt-8 p-6">
        <SignupForm defaultRole={defaultRole} t={t} />
      </div>

      <p className="mt-6 text-center text-sm text-encre-500">
        {t.auth.haveAccount}{' '}
        <Link href={path('/connexion')} className="font-semibold text-argile-600">
          {t.auth.login}
        </Link>
      </p>
    </div>
  )
}
