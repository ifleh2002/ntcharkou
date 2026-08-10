import type { Metadata } from 'next'
import { RequestForm } from '@/components/request-form'
import { Alert } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { getCities, getLand, getRegions } from '@/lib/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ParticipantProfile, PropertyNeed } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: getDictionary(resolveLocale(locale)).requestForm.title }
}

/** Pré-remplissage depuis « Recevoir une alerte similaire » sur une fiche terrain. */
const NEEDS_BY_ZONING: Record<string, PropertyNeed[]> = {
  residentiel: ['appartement_r2', 'terrain_r2'],
  r2: ['appartement_r2', 'terrain_r2'],
  r3: ['terrain_r3', 'appartement_immeuble'],
  r4: ['terrain_r4', 'appartement_immeuble'],
  villa: ['terrain_villa'],
  lotissement: ['terrain_villa', 'terrain_r2'],
  immeuble: ['appartement_immeuble'],
  industriel: ['terrain_industriel'],
  agricole: ['mini_ferme'],
}

export default async function NouvelleDemandePage({
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
  const session = await requireSession('/mes-demandes/nouvelle')
  const supabase = await createSupabaseServerClient()

  const landId = typeof query.terrain === 'string' ? query.terrain : null

  const [regions, cities, participantProfile, land] = await Promise.all([
    getRegions(locale),
    getCities(locale),
    supabase
      .from('participant_profiles')
      .select('*')
      .eq('profile_id', session.userId)
      .maybeSingle<ParticipantProfile>(),
    landId ? getLand(landId, locale) : Promise.resolve(null),
  ])

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-encre-900">{t.requestForm.title}</h1>
        <p className="mt-2 max-w-2xl text-encre-500">{t.requestForm.lead}</p>
      </header>

      {land ? (
        <div className="mb-6">
          <Alert tone="info" title={t.requestForm.fromLandTitle}>
            {t.requestForm.fromLandBody} « {land.title} » ({land.city_name ?? land.region_name}).{' '}
            {t.requestForm.fromLandAdjust}
          </Alert>
        </div>
      ) : null}

      <RequestForm
        regions={regions}
        cities={cities}
        profile={session.profile}
        participantProfile={participantProfile.data ?? null}
        t={t}
        f={f}
        defaults={
          land
            ? {
                region_code: land.region_code,
                city_id: land.city_id,
                needs: NEEDS_BY_ZONING[land.zoning] ?? [],
                budget_total_max: land.total_price,
              }
            : undefined
        }
      />
    </div>
  )
}
