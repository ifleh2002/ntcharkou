import type { Metadata } from 'next'
import { LandMap, type MapLand } from '@/components/land-map'
import { EmptyState } from '@/components/ui'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = getDictionary(resolveLocale(locale))
  return { title: t.map.title, description: t.map.lead }
}

export default async function CartePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const { t } = translation(locale)

  let lands: MapLand[] = []
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient()
    // Les terrains masqués sont écartés par la vue ; on ne diffuse que le publié.
    const { data } = await supabase
      .from('land_listings_public')
      .select(
        'id, title, title_ar, reference, market_status, zoning, zonings, surface_m2, ' +
          'parcel_area_m2, price_per_m2, total_price, has_water, has_electricity, ' +
          'has_sewage, parcel, map_lat, map_lng',
      )
      .eq('status', 'publie')
      .neq('market_status', 'masque')
      .limit(500)

    lands = ((data ?? []) as unknown as (MapLand & { title_ar: string | null })[]).map((land) => ({
      ...land,
      // Même règle qu'ailleurs : la graphie de la langue en cours, le français
      // en repli.
      title: (locale === 'ar' ? land.title_ar || land.title : land.title) ?? land.title,
    }))
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-encre-900">{t.map.title}</h1>
        <p className="mt-2 max-w-2xl text-encre-500">{t.map.lead}</p>
      </header>

      {lands.length === 0 ? (
        <EmptyState icon="🗺️" title={t.map.emptyTitle} description={t.map.emptyBody} />
      ) : (
        <LandMap lands={lands} t={t} locale={locale} height={600} />
      )}
    </div>
  )
}
