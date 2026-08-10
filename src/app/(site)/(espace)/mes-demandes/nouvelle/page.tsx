import type { Metadata } from 'next'
import { RequestForm } from '@/components/request-form'
import { Alert } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { getCities, getLand, getRegions } from '@/lib/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ParticipantProfile, PropertyNeed } from '@/lib/types'

export const metadata: Metadata = { title: 'Déposer une demande' }

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
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const session = await requireSession('/mes-demandes/nouvelle')
  const supabase = await createSupabaseServerClient()

  const landId = typeof params.terrain === 'string' ? params.terrain : null

  const [regions, cities, participantProfile, land] = await Promise.all([
    getRegions(),
    getCities(),
    supabase
      .from('participant_profiles')
      .select('*')
      .eq('profile_id', session.userId)
      .maybeSingle<ParticipantProfile>(),
    landId ? getLand(landId) : Promise.resolve(null),
  ])

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-encre-900">Déposer une demande</h1>
        <p className="mt-2 max-w-2xl text-encre-500">
          Décrivez précisément ce que vous cherchez. Plus votre demande est détaillée, plus les
          correspondances proposées seront pertinentes.
        </p>
      </header>

      {land ? (
        <div className="mb-6">
          <Alert tone="info" title="Alerte créée à partir d’un terrain">
            Les critères ont été pré-remplis à partir de « {land.title} » ({land.city_name ?? land.region_name}).
            Ajustez-les librement.
          </Alert>
        </div>
      ) : null}

      <RequestForm
        regions={regions}
        cities={cities}
        profile={session.profile}
        participantProfile={participantProfile.data ?? null}
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
