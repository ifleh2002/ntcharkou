import type { Metadata } from 'next'
import { ProjectForm } from '@/components/project-form'
import { Alert } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { getCities, getLand, getRegions } from '@/lib/queries'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: getDictionary(resolveLocale(locale)).projectForm.title }
}

export default async function NouveauProjetPage({
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
  await requireSession('/mes-projets/nouveau')

  const landId = typeof query.terrain === 'string' ? query.terrain : null
  const [regions, cities, land] = await Promise.all([
    getRegions(locale),
    getCities(locale),
    landId ? getLand(landId, locale) : Promise.resolve(null),
  ])

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-encre-900">{t.projectForm.title}</h1>
        <p className="mt-2 max-w-2xl text-encre-500">{t.projectForm.lead}</p>
      </header>

      {land ? (
        <div className="mb-6">
          <Alert tone="info" title={t.projectForm.fromLandTitle}>
            {t.projectForm.fromLandBody} « {land.title} » ({land.city_name ?? land.region_name},{' '}
            {f.surface(land.surface_m2)}). {t.projectForm.estimatedCapacity} :{' '}
            {land.estimated_units ?? '—'}.
          </Alert>
        </div>
      ) : null}

      <ProjectForm
        regions={regions}
        cities={cities}
        t={t}
        locale={locale}
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
