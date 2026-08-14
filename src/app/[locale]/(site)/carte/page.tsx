import type { Metadata } from 'next'
import Link from 'next/link'
import { LandMap, type MapLand } from '@/components/land-map'
import { Alert, EmptyState } from '@/components/ui'
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

/** Colonnes strictement nécessaires à la carte. */
const COLUMNS =
  'id, title, title_ar, reference, market_status, zoning, zonings, surface_m2, ' +
  'parcel_area_m2, price_per_m2, total_price, has_water, has_electricity, ' +
  'has_sewage, parcel, map_lat, map_lng'

export default async function CartePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const { t, path } = translation(locale)

  let lands: MapLand[] = []
  let openProjects = 0
  let queryError: string | null = null

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('land_listings_public')
      .select(COLUMNS)
      .eq('status', 'publie')
      .neq('market_status', 'masque')
      .limit(500)

    // Compteur affiché sur la carte, à côté du nombre de terrains.
    const { count } = await supabase
      .from('projects_public')
      .select('id', { count: 'exact', head: true })
      .in('status', ['ouvert', 'groupe_constitue', 'en_preparation', 'realise'])
    openProjects = count ?? 0

    // Une requête en échec ne doit pas se déguiser en « aucun terrain » : les
    // deux se ressemblent à l'écran, mais l'une se corrige et l'autre non.
    // C'est notamment le cas quand une colonne vient d'être ajoutée et que le
    // cache de schéma de PostgREST n'a pas encore été rechargé.
    if (error) {
      queryError = error.message
    } else {
      lands = ((data ?? []) as unknown as (MapLand & { title_ar: string | null })[]).map(
        (land) => ({
          ...land,
          // Même règle qu'ailleurs : la graphie de la langue en cours, le
          // français en repli.
          title: (locale === 'ar' ? land.title_ar || land.title : land.title) ?? land.title,
        }),
      )
    }
  }

  // Un terrain sans contour ni coordonnées ne peut pas être placé : il faut le
  // dire, sinon la carte paraît vide sans raison apparente.
  const placeable = lands.filter(
    (land) => land.parcel !== null || (land.map_lat !== null && land.map_lng !== null),
  )
  const unplaceable = lands.length - placeable.length

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-encre-900">{t.map.title}</h1>
        <p className="mt-2 max-w-2xl text-encre-500">{t.map.lead}</p>
      </header>

      {queryError ? (
        <div className="mb-6">
          <Alert tone="danger" title={t.map.errorTitle}>
            <p className="whitespace-pre-line">{queryError}</p>
            <p className="mt-2 text-sm">{t.map.errorHint}</p>
          </Alert>
        </div>
      ) : null}

      {placeable.length > 0 ? (
        <LandMap
          lands={placeable}
          t={t}
          locale={locale}
          height={600}
          openProjects={openProjects}
        />
      ) : queryError ? null : (
        <EmptyState
          icon="🗺️"
          title={lands.length > 0 ? t.map.noCoordinatesTitle : t.map.emptyTitle}
          description={lands.length > 0 ? t.map.noCoordinatesBody : t.map.emptyBody}
        />
      )}

      {unplaceable > 0 && placeable.length > 0 ? (
        <p className="mt-4 text-sm text-encre-500">
          {unplaceable} {t.map.unplacedCount}{' '}
          <Link href={path('/mes-terrains')} className="font-semibold text-argile-600 underline">
            {t.map.drawThem}
          </Link>
        </p>
      ) : null}
    </div>
  )
}
