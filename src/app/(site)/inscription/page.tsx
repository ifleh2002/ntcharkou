import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SignupForm } from '@/components/auth-forms'
import { getSessionContext } from '@/lib/auth'

export const metadata: Metadata = { title: 'Inscription' }

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const session = await getSessionContext()
  if (session) redirect('/tableau-de-bord')

  const defaultRole = params.role === 'owner' ? 'owner' : 'participant'

  return (
    <div className="mx-auto flex max-w-lg flex-col px-4 py-14">
      <h1 className="text-3xl font-bold text-encre-900">Créer un compte</h1>
      <p className="mt-2 text-encre-500">
        Un seul compte pour proposer un terrain, déposer une demande et rejoindre un projet.
      </p>

      <div className="surface mt-8 p-6">
        <SignupForm defaultRole={defaultRole} />
      </div>

      <p className="mt-6 text-center text-sm text-encre-500">
        Vous avez déjà un compte ?{' '}
        <Link href="/connexion" className="font-semibold text-argile-600">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
