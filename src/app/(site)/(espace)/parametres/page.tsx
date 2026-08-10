import type { Metadata } from 'next'
import { signOut } from '@/app/actions/auth'
import { updatePassword } from '@/app/actions/profile'
import { Alert, Button, Card, Field, SectionTitle } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/labels'

export const metadata: Metadata = { title: 'Paramètres du compte' }

export default async function ParametresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const session = await requireSession('/parametres')

  return (
    <div>
      <SectionTitle title="Paramètres du compte" />

      {params.enregistre ? (
        <div className="mb-5">
          <Alert tone="succes">Vos paramètres ont été mis à jour.</Alert>
        </div>
      ) : null}
      {params.erreur === 'mot_de_passe' ? (
        <div className="mb-5">
          <Alert tone="danger">
            Le mot de passe n’a pas pu être modifié. Il doit contenir au moins 8 caractères.
          </Alert>
        </div>
      ) : null}

      <div className="space-y-6">
        <Card>
          <h2 className="font-semibold text-encre-900">Compte</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-encre-400">Adresse de connexion</dt>
              <dd className="text-sm font-medium text-encre-900">{session.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-encre-400">Rôle</dt>
              <dd className="text-sm font-medium text-encre-900">
                {ROLE_LABELS[session.profile.role]}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-encre-400">Inscrit le</dt>
              <dd className="text-sm font-medium text-encre-900">
                {formatDate(session.profile.created_at)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="font-semibold text-encre-900">Changer de mot de passe</h2>
          <form action={updatePassword} className="mt-4 max-w-sm space-y-4">
            <Field label="Nouveau mot de passe" htmlFor="password" hint="8 caractères minimum." required>
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
            <Button type="submit">Mettre à jour</Button>
          </form>
        </Card>

        <Card>
          <h2 className="font-semibold text-encre-900">Confidentialité</h2>
          <p className="mt-2 text-sm leading-relaxed text-encre-500">
            Votre téléphone, votre email, votre numéro de CIN et vos documents juridiques ne sont
            jamais publiés. Sur les pages publiques, seuls votre prénom et l’initiale de votre nom
            peuvent apparaître, et uniquement dans le cadre d’un projet auquel vous participez.
          </p>
        </Card>

        <Card>
          <h2 className="font-semibold text-encre-900">Session</h2>
          <form action={signOut} className="mt-4">
            <Button type="submit" variant="secondary">
              Se déconnecter
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
