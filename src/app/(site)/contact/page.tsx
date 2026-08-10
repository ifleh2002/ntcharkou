import type { Metadata } from 'next'
import { reportListing } from '@/app/actions/interactions'
import { Alert, Button, Card, Field } from '@/components/ui'
import { getSessionContext } from '@/lib/auth'
import { REPORT_REASON_LABELS } from '@/lib/labels'
import type { ReportReason } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contactez l’équipe Ntcharkou ou signalez une annonce.',
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const landId = typeof params.terrain === 'string' ? params.terrain : null
  const session = await getSessionContext()

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-encre-900">Contact</h1>
      <p className="mt-2 text-encre-500">
        Une question sur un terrain, un projet ou votre compte ? Écrivez-nous.
      </p>

      {params.signalement ? (
        <div className="mt-6">
          <Alert tone="succes" title="Signalement enregistré">
            Merci. L’équipe de modération examinera l’annonce dans les meilleurs délais.
          </Alert>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-encre-900">Écrire à l’équipe</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-encre-400">Email</dt>
              <dd className="font-medium text-encre-900">contact@ntcharkou.ma</dd>
            </div>
            <div>
              <dt className="text-encre-400">Téléphone</dt>
              <dd className="font-medium text-encre-900">+212 5 22 00 00 00</dd>
            </div>
            <div>
              <dt className="text-encre-400">Horaires</dt>
              <dd className="font-medium text-encre-900">Du lundi au vendredi, 9 h – 18 h</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-encre-400">
            Pour une question portant sur un terrain précis, indiquez sa référence
            (par exemple TER-2026-000128) : le traitement sera plus rapide.
          </p>
        </Card>

        <Card>
          <h2 className="font-semibold text-encre-900">
            {landId ? 'Signaler cette annonce' : 'Signaler une annonce'}
          </h2>
          {session ? (
            <form action={reportListing} className="mt-4 space-y-4">
              <input type="hidden" name="land_id" value={landId ?? ''} />
              <input type="hidden" name="return_to" value="/contact" />

              <Field label="Motif" htmlFor="reason" required>
                <select id="reason" name="reason" className="champ" required defaultValue="">
                  <option value="" disabled>
                    Choisissez un motif
                  </option>
                  {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map((key) => (
                    <option key={key} value={key}>
                      {REPORT_REASON_LABELS[key]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Détails" htmlFor="details">
                <textarea id="details" name="details" rows={4} className="champ" />
              </Field>

              <Button type="submit" variant="secondary" className="w-full" disabled={!landId}>
                {landId ? 'Envoyer le signalement' : 'Ouvrez une fiche terrain pour signaler'}
              </Button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-encre-500">
              Connectez-vous pour signaler une annonce. Cela nous permet de traiter les signalements
              sérieusement et d’éviter les abus.
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
