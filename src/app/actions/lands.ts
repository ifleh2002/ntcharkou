'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getActionTranslation } from '@/lib/i18n/server'
import { firstIssueMessage } from './validation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { LandZoning } from '@/lib/types'

export interface LandActionResult {
  error?: string
  landId?: string
}

const optionalNumber = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : Number(value)))
  .refine((value) => value === null || Number.isFinite(value), 'Valeur numérique invalide')

const landSchema = z.object({
  // Etape 1 — informations personnelles
  first_name: z.string().trim().min(1, 'Le prénom est obligatoire'),
  last_name: z.string().trim().min(1, 'Le nom est obligatoire'),
  phone: z.string().trim().min(6, 'Le téléphone est obligatoire'),
  contact_email: z.string().trim().email('Adresse email invalide'),
  residence_region: z.string().trim().optional().default(''),
  residence_city: z.string().trim().optional().default(''),
  owner_kind: z.enum(['particulier', 'societe', 'heritiers', 'mandataire']),
  company_name: z.string().trim().optional().default(''),
  cin_number: z.string().trim().optional().default(''),

  // Etape 2 — localisation
  region_code: z.string().trim().min(1, 'La région est obligatoire'),
  city_id: z.string().trim().optional().default(''),
  city_other: z.string().trim().optional().default(''),
  district: z.string().trim().optional().default(''),
  address: z.string().trim().optional().default(''),
  latitude: optionalNumber,
  longitude: optionalNumber,

  // Etape 3 — caracteristiques
  title: z.string().trim().optional().default(''),
  description: z.string().trim().optional().default(''),
  zoning: z.enum([
    'residentiel',
    'r2',
    'r3',
    'r4',
    'villa',
    'lotissement',
    'immeuble',
    'commercial',
    'industriel',
    'agricole',
    'autre',
  ]),
  surface_m2: z
    .string()
    .trim()
    .min(1, 'La superficie est obligatoire')
    .transform(Number)
    .refine((value) => Number.isFinite(value) && value > 0, 'Superficie invalide'),
  facade_m: optionalNumber,
  depth_m: optionalNumber,
  facade_count: optionalNumber,
  road_width_m: optionalNumber,
  land_title_ref: z.string().trim().optional().default(''),
  legal_status: z.string().trim().optional().default(''),
  observations: z.string().trim().optional().default(''),
  declared_units: optionalNumber,

  // Etape 4 — prix
  price_per_m2: optionalNumber,
  price_negotiable: z.string().optional(),

  // Etape 5 — reseaux
  has_water: z.string().optional(),
  has_electricity: z.string().optional(),
  has_sewage: z.string().optional(),
  has_telecom: z.string().optional(),
  has_gas: z.string().optional(),
  network_other: z.string().trim().optional().default(''),

  intent: z.enum(['brouillon', 'soumis']).default('soumis'),
})

function checked(value: string | undefined) {
  return value === 'on' || value === '1' || value === 'true'
}

/** Depot d'un terrain (formulaire propriétaire en 6 étapes, section 3). */
export async function saveLand(formData: FormData): Promise<LandActionResult> {
  const supabase = await createSupabaseServerClient()
  const { t } = await getActionTranslation()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: t.auth.errCredentials }

  const parsed = landSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      error: firstIssueMessage(t, parsed.error, {
        first_name: t.auth.firstName,
        last_name: t.auth.lastName,
        phone: t.auth.phone,
        contact_email: t.auth.email,
        region_code: t.common.region,
        zoning: t.lands.zoning,
        surface_m2: t.landForm.surface,
      }),
    }
  }
  const values = parsed.data

  const cityId = values.city_id || null
  // Titre généré dans la langue de saisie du propriétaire.
  const title = values.title || t.enums.zoning[values.zoning as LandZoning]

  // Etape 1 : les informations personnelles alimentent le profil, jamais l'annonce.
  await supabase
    .from('profiles')
    .update({
      first_name: values.first_name,
      last_name: values.last_name,
      phone: values.phone,
      email: values.contact_email,
      region_code: values.residence_region || null,
      city_id: values.residence_city || null,
    })
    .eq('id', user.id)

  await supabase.from('owner_profiles').upsert(
    {
      profile_id: user.id,
      owner_kind: values.owner_kind,
      company_name: values.company_name || null,
      cin_number: values.cin_number || null,
    },
    { onConflict: 'profile_id' },
  )

  const { data, error } = await supabase
    .from('land_listings')
    .insert({
      owner_id: user.id,
      title,
      description: values.description || null,
      region_code: values.region_code,
      city_id: cityId,
      city_other: cityId ? null : values.city_other || null,
      district: values.district || null,
      address: values.address || null,
      latitude: values.latitude,
      longitude: values.longitude,
      zoning: values.zoning,
      surface_m2: values.surface_m2,
      facade_m: values.facade_m,
      depth_m: values.depth_m,
      facade_count: values.facade_count,
      road_width_m: values.road_width_m,
      land_title_ref: values.land_title_ref || null,
      legal_status: values.legal_status || null,
      observations: values.observations || null,
      declared_units: values.declared_units,
      price_per_m2: values.price_per_m2,
      price_negotiable: checked(values.price_negotiable),
      has_water: checked(values.has_water),
      has_electricity: checked(values.has_electricity),
      has_sewage: checked(values.has_sewage),
      has_telecom: checked(values.has_telecom),
      has_gas: checked(values.has_gas),
      network_other: values.network_other || null,
      status: values.intent,
      submitted_at: values.intent === 'soumis' ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error) {
    return { error: `${t.landForm.errSave} ${error.message}` }
  }

  revalidatePath('/', 'layout')
  return { landId: data.id as string }
}

/** Soumet un brouillon à la validation administrative. */
export async function submitLand(formData: FormData) {
  const landId = formData.get('land_id') as string
  const { path } = await getActionTranslation()
  const supabase = await createSupabaseServerClient()
  await supabase.from('land_listings').update({ status: 'soumis' }).eq('id', landId)
  revalidatePath(path('/mes-terrains'))
  revalidatePath(path(`/mes-terrains/${landId}`))
}

/** Retire une annonce de la publication. */
export async function archiveLand(formData: FormData) {
  const landId = formData.get('land_id') as string
  const { path } = await getActionTranslation()
  const supabase = await createSupabaseServerClient()
  await supabase.from('land_listings').update({ status: 'archive' }).eq('id', landId)
  revalidatePath(path('/mes-terrains'))
  revalidatePath(path(`/mes-terrains/${landId}`))
}

/** Supprime un brouillon. */
export async function deleteLand(formData: FormData) {
  const landId = formData.get('land_id') as string
  const { path } = await getActionTranslation()
  const supabase = await createSupabaseServerClient()
  await supabase.from('land_listings').delete().eq('id', landId)
  revalidatePath(path('/mes-terrains'))
}
