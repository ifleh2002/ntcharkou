import type { Metadata } from 'next'
import { ProjectForm } from '@/components/project-form'
import { Alert } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { getCities, getLand, getRegions } from '@/lib/queries'

export const metadata: Metadata = { title: 'Créer mon groupe' }

export default async function NouveauProjetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  await requireSession('/mes-projets/nouveau')

  const landId = typeof params.terrain === 'string' ? params.terrain : null
  const [regions, cities, land] = await Promise.all([
    getRegions(),
    getCities(),
    landId ? getLand(landId) : Promise.resolve(null),
  ])

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-encre-900">Créer mon groupe</h1>
        <p className="mt-2 max-w-2xl text-encre-500">
          Réunissez des participants autour d’un même projet — éventuellement du même corps
          professionnel. Vous définissez la ville, la typologie, le nombre de logements et le budget ;
          les autres participants demandent à vous rejoindre.
        </p>
      </header>

      {land ? (
        <div className="mb-6">
          <Alert tone="info" title="Groupe adossé à un terrain">
            Ce groupe sera rattaché au terrain « {land.title} » ({land.city_name ?? land.region_name},{' '}
            {land.surface_m2} m²). Capacité estimée : {land.estimated_units ?? '—'} logements.
          </Alert>
        </div>
      ) : null}

      <ProjectForm
        regions={regions}
        cities={cities}
        defaults={
          land
            ? {
                land_id: land.id,
                region_code: land.region_code,
                city_id: land.city_id,
                zoning: land.zoning,
                units: land.estimated_units,
              }
            : undefined
        }
      />
    </div>
  )
}
