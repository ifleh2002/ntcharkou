import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth-forms'
import { getSessionContext } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: getDictionary(resolveLocale(locale)).auth.loginTitle }
}

export default async function ConnexionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const query = await searchParams
  const { t, path } = translation(resolveLocale(locale))

  const next = typeof query.suivant === 'string' ? query.suivant : '/tableau-de-bord'
  const session = await getSessionContext()
  if (session) redirect(path(next))

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="text-3xl font-bold text-encre-900">{t.auth.loginTitle}</h1>
      <p className="mt-2 text-encre-500">{t.auth.loginLead}</p>

      <div className="surface mt-8 p-6">
        <LoginForm next={next} t={t} />
      </div>

      <p className="mt-6 text-center text-sm text-encre-500">
        {t.auth.noAccount}{' '}
        <Link href={path('/inscription')} className="font-semibold text-argile-600">
          {t.auth.createAccount}
        </Link>
      </p>
    </div>
  )
}
