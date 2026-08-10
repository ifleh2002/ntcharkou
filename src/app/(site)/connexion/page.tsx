import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth-forms'
import { getSessionContext } from '@/lib/auth'

export const metadata: Metadata = { title: 'Connexion' }

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const next = typeof params.suivant === 'string' ? params.suivant : '/tableau-de-bord'

  const session = await getSessionContext()
  if (session) redirect(next)

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="text-3xl font-bold text-encre-900">Connexion</h1>
      <p className="mt-2 text-encre-500">Accédez à vos demandes, vos terrains et vos correspondances.</p>

      <div className="surface mt-8 p-6">
        <LoginForm next={next} />
      </div>

      <p className="mt-6 text-center text-sm text-encre-500">
        Pas encore de compte ?{' '}
        <Link href="/inscription" className="font-semibold text-argile-600">
          Créer un compte
        </Link>
      </p>
    </div>
  )
}
