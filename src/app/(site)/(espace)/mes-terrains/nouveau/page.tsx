import type { Metadata } from 'next'
import { LandForm } from '@/components/land-form'
import { Alert } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { getCities, getRegions } from '@/lib/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { OwnerKind } from '@/lib/types'

export const metadata: Metadata = { title: 'Proposer un terrain' }

export default async function NouveauTerrainPage() {
  const session = await requireSession('/mes-terrains/nouveau')
  const supabase = await createSupabaseServerClient()

  const [regions, cities, ownerProfile] = await Promise.all([
    getRegions(),
    getCities(),
    supabase.from('owner_profiles').select('owner_kind').eq('profile_id', session.userId).maybeSingle(),
  ])

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-encre-900">Proposer un terrain</h1>
        <p className="mt-2 max-w-2xl text-encre-500">
          Six étapes. Votre annonce sera vérifiée par l’administration avant publication, et le
          moteur de matching identifiera immédiatement les demandes compatibles.
        </p>
      </header>

      <div className="mb-6">
        <Alert tone="info" title="Ce qui reste privé">
          Votre téléphone, votre email, votre CIN et vos documents juridiques ne sont jamais publiés.
          Ils servent uniquement à la vérification administrative.
        </Alert>
      </div>

      <LandForm
        regions={regions}
        cities={cities}
        profile={session.profile}
        ownerKind={(ownerProfile.data?.owner_kind as OwnerKind) ?? 'particulier'}
      />
    </div>
  )
}
