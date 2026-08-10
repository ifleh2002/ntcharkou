import type { Metadata } from 'next'
import { updateProfile } from '@/app/actions/profile'
import { Alert, Badge, Button, Card, Field, ProgressBar, SectionTitle } from '@/components/ui'
import { CitySelect } from '@/components/city-select'
import { profileCompletion, requireSession } from '@/lib/auth'
import { OWNER_KIND_LABELS, PROFESSIONAL_BODY_LABELS, ROLE_LABELS } from '@/lib/labels'
import { getCities, getRegions } from '@/lib/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { OwnerKind, OwnerProfile, ParticipantProfile, ProfessionalBody } from '@/lib/types'

export const metadata: Metadata = { title: 'Mon profil' }

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const session = await requireSession('/profil')
  const supabase = await createSupabaseServerClient()

  const [regions, cities, participant, owner] = await Promise.all([
    getRegions(),
    getCities(),
    supabase
      .from('participant_profiles')
      .select('*')
      .eq('profile_id', session.userId)
      .maybeSingle<ParticipantProfile>(),
    supabase
      .from('owner_profiles')
      .select('*')
      .eq('profile_id', session.userId)
      .maybeSingle<OwnerProfile>(),
  ])

  const completion = profileCompletion(session.profile)

  return (
    <div>
      <SectionTitle
        title="Mon profil"
        subtitle="Ces informations restent privées : elles ne sont visibles que par vous et l’administration."
      />

      {params.enregistre ? (
        <div className="mb-5">
          <Alert tone="succes">Votre profil a été mis à jour.</Alert>
        </div>
      ) : null}

      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="argile">{ROLE_LABELS[session.profile.role]}</Badge>
          {owner.data?.is_verified ? <Badge tone="succes">✅ Propriétaire vérifié</Badge> : null}
        </div>
        <div className="mt-4 max-w-sm">
          <p className="mb-1.5 text-sm text-encre-500">Profil complété à {completion} %</p>
          <ProgressBar value={completion} max={100} tone="argile" />
        </div>
      </Card>

      <form action={updateProfile} className="space-y-6">
        <section className="surface p-6">
          <h2 className="text-lg font-bold text-encre-900">Identité et coordonnées</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" htmlFor="first_name" required>
              <input
                id="first_name"
                name="first_name"
                required
                defaultValue={session.profile.first_name}
                className="champ"
              />
            </Field>
            <Field label="Nom" htmlFor="last_name" required>
              <input
                id="last_name"
                name="last_name"
                required
                defaultValue={session.profile.last_name}
                className="champ"
              />
            </Field>
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={session.profile.email ?? ''}
                className="champ"
              />
            </Field>
            <Field label="Téléphone" htmlFor="phone">
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={session.profile.phone ?? ''}
                className="champ"
              />
            </Field>
          </div>

          <div className="mt-4">
            <CitySelect
              regions={regions}
              cities={cities}
              defaultRegion={session.profile.region_code ?? ''}
              defaultCity={session.profile.city_id ?? ''}
            />
          </div>

          <div className="mt-4">
            <Field label="Quartier" htmlFor="district">
              <input
                id="district"
                name="district"
                defaultValue={session.profile.district ?? ''}
                className="champ"
              />
            </Field>
          </div>
        </section>

        <section className="surface p-6">
          <h2 className="text-lg font-bold text-encre-900">Situation professionnelle</h2>
          <p className="mt-1 text-sm text-encre-500">
            Utilisée pour constituer des groupes par corps professionnel.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Corps / fonction" htmlFor="professional_body">
              <select
                id="professional_body"
                name="professional_body"
                className="champ"
                defaultValue={participant.data?.professional_body ?? 'autre'}
              >
                {(Object.keys(PROFESSIONAL_BODY_LABELS) as ProfessionalBody[]).map((key) => (
                  <option key={key} value={key}>
                    {PROFESSIONAL_BODY_LABELS[key]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Situation" htmlFor="professional_status">
              <input
                id="professional_status"
                name="professional_status"
                className="champ"
                defaultValue={participant.data?.professional_status ?? ''}
                placeholder="Salarié, libéral, fonctionnaire…"
              />
            </Field>
            <Field label="Employeur / structure" htmlFor="employer">
              <input
                id="employer"
                name="employer"
                className="champ"
                defaultValue={participant.data?.employer ?? ''}
              />
            </Field>
          </div>
        </section>

        <section className="surface p-6">
          <h2 className="text-lg font-bold text-encre-900">Informations propriétaire</h2>
          <p className="mt-1 text-sm text-encre-500">
            À compléter si vous proposez un ou plusieurs terrains.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Type de propriétaire" htmlFor="owner_kind">
              <select
                id="owner_kind"
                name="owner_kind"
                className="champ"
                defaultValue={owner.data?.owner_kind ?? 'particulier'}
              >
                {(Object.keys(OWNER_KIND_LABELS) as OwnerKind[]).map((key) => (
                  <option key={key} value={key}>
                    {OWNER_KIND_LABELS[key]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Raison sociale" htmlFor="company_name">
              <input
                id="company_name"
                name="company_name"
                className="champ"
                defaultValue={owner.data?.company_name ?? ''}
              />
            </Field>
            <Field
              label="Numéro de CIN"
              htmlFor="cin_number"
              hint="Privé — vérification administrative uniquement."
            >
              <input
                id="cin_number"
                name="cin_number"
                className="champ"
                defaultValue={owner.data?.cin_number ?? ''}
              />
            </Field>
          </div>
        </section>

        <Button type="submit" size="lg">
          Enregistrer mon profil
        </Button>
      </form>
    </div>
  )
}
