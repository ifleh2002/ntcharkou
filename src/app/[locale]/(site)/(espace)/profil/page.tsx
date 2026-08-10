import type { Metadata } from 'next'
import { updateProfile } from '@/app/actions/profile'
import { CitySelect } from '@/components/city-select'
import { Alert, Badge, Button, Card, Field, ProgressBar, SectionTitle } from '@/components/ui'
import { profileCompletion, requireSession } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { getCities, getRegions } from '@/lib/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { OwnerKind, OwnerProfile, ParticipantProfile, ProfessionalBody } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: getDictionary(resolveLocale(locale)).profile.title }
}

export default async function ProfilPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const { t } = translation(locale)

  const query = await searchParams
  const session = await requireSession('/profil')
  const supabase = await createSupabaseServerClient()

  const [regions, cities, participant, owner] = await Promise.all([
    getRegions(locale),
    getCities(locale),
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
      <SectionTitle title={t.profile.title} subtitle={t.profile.lead} />

      {query.enregistre ? (
        <div className="mb-5">
          <Alert tone="succes">{t.profile.saved}</Alert>
        </div>
      ) : null}

      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="argile">{t.enums.role[session.profile.role]}</Badge>
          {owner.data?.is_verified ? <Badge tone="succes">✅ {t.profile.verifiedOwner}</Badge> : null}
        </div>
        <div className="mt-4 max-w-sm">
          <p className="mb-1.5 text-sm text-encre-500">
            {t.profile.completion} {completion} %
          </p>
          <ProgressBar value={completion} max={100} tone="argile" />
        </div>
      </Card>

      <form action={updateProfile} className="space-y-6">
        <section className="surface p-6">
          <h2 className="text-lg font-bold text-encre-900">{t.profile.identityTitle}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label={t.auth.firstName} htmlFor="first_name" required>
              <input
                id="first_name"
                name="first_name"
                required
                defaultValue={session.profile.first_name}
                className="champ"
              />
            </Field>
            <Field label={t.auth.lastName} htmlFor="last_name" required>
              <input
                id="last_name"
                name="last_name"
                required
                defaultValue={session.profile.last_name}
                className="champ"
              />
            </Field>
            <Field label={t.auth.email} htmlFor="email">
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={session.profile.email ?? ''}
                className="champ"
              />
            </Field>
            <Field label={t.auth.phone} htmlFor="phone">
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
              labels={{ region: t.common.region, city: t.common.city }}
            />
          </div>

          <div className="mt-4">
            <Field label={t.common.district} htmlFor="district">
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
          <h2 className="text-lg font-bold text-encre-900">{t.profile.professionalTitle}</h2>
          <p className="mt-1 text-sm text-encre-500">{t.profile.professionalLead}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label={t.requestForm.professionalBody} htmlFor="professional_body">
              <select
                id="professional_body"
                name="professional_body"
                className="champ"
                defaultValue={participant.data?.professional_body ?? 'autre'}
              >
                {(Object.keys(t.enums.professionalBody) as ProfessionalBody[]).map((key) => (
                  <option key={key} value={key}>
                    {t.enums.professionalBody[key]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.profile.situation} htmlFor="professional_status">
              <input
                id="professional_status"
                name="professional_status"
                className="champ"
                defaultValue={participant.data?.professional_status ?? ''}
                placeholder={t.requestForm.professionalStatusPlaceholder}
              />
            </Field>
            <Field label={t.profile.employer} htmlFor="employer">
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
          <h2 className="text-lg font-bold text-encre-900">{t.profile.ownerTitle}</h2>
          <p className="mt-1 text-sm text-encre-500">{t.profile.ownerLead}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label={t.landForm.ownerKind} htmlFor="owner_kind">
              <select
                id="owner_kind"
                name="owner_kind"
                className="champ"
                defaultValue={owner.data?.owner_kind ?? 'particulier'}
              >
                {(Object.keys(t.enums.ownerKind) as OwnerKind[]).map((key) => (
                  <option key={key} value={key}>
                    {t.enums.ownerKind[key]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.landForm.companyName} htmlFor="company_name">
              <input
                id="company_name"
                name="company_name"
                className="champ"
                defaultValue={owner.data?.company_name ?? ''}
              />
            </Field>
            <Field label={t.landForm.cin} htmlFor="cin_number" hint={t.landForm.cinHint}>
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
          {t.profile.save}
        </Button>
      </form>
    </div>
  )
}
