'use server'

import { revalidatePath } from 'next/cache'
import { getActionTranslation } from '@/lib/i18n/server'
import type { GeoPolygon } from '@/lib/map'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Enregistre le contour d'une parcelle.
 *
 * La validation du tracé se fait côté base : `set_land_parcel` vérifie que le
 * demandeur possède le terrain, que la géométrie est bien un polygone, et
 * répare un contour qui se recoupe. Faire confiance au navigateur laisserait
 * entrer des géométries qui casseraient les mesures et les recherches
 * spatiales.
 */
export async function saveParcel(
  landId: string,
  polygon: GeoPolygon | null,
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { t, path } = await getActionTranslation()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: t.auth.errCredentials }

  const { error } = await supabase.rpc('set_land_parcel', {
    p_land: landId,
    p_geojson: polygon,
  })

  if (error) return { error: error.message }

  revalidatePath(path('/terrains'))
  revalidatePath(path(`/terrains/${landId}`))
  revalidatePath(path(`/mes-terrains/${landId}`))
  revalidatePath(path('/carte'))
  return {}
}
