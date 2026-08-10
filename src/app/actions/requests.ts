'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getActionTranslation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { firstIssueMessage } from './validation'
import type { PropertyNeed } from '@/lib/types'

export interface RequestActionResult {
  error?: string
  requestId?: string
}

const optionalNumber = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : Number(value)))
  .refine((value) => value === null || Number.isFinite(value), 'Valeur numérique invalide')

const requestSchema = z.object({
  title: z.string().trim().optional().default(''),
  notes: z.string().trim().optional().default(''),

  region_code: z.string().trim().optional().default(''),
  city_id: z.string().trim().optional().default(''),
  district: z.string().trim().optional().default(''),

  budget_total_min: optionalNumber,
  budget_total_max: optionalNumber,
  budget_per_unit_min: optionalNumber,
  budget_per_unit_max: optionalNumber,
  units_wanted: optionalNumber,
  surface_min_m2: optionalNumber,
  surface_max_m2: optionalNumber,

  same_body_preference: z.enum(['oui', 'non', 'indifferent']).default('indifferent'),
  preferred_body: z.string().trim().optional().default(''),

  professional_status: z.string().trim().optional().default(''),
  professional_body: z.string().trim().optional().default(''),

  requires_water: z.string().optional(),
  requires_electricity: z.string().optional(),
  requires_sewage: z.string().optional(),
})

function checked(value: FormDataEntryValue | null) {
  return value === 'on' || value === '1'
}

/** Depot d'une demande participant (sections 5 a 9). */
export async function saveRequest(formData: FormData): Promise<RequestActionResult> {
  const supabase = await createSupabaseServerClient()
  const { t } = await getActionTranslation()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: t.auth.errCredentials }

  const parsed = requestSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      error: firstIssueMessage(t, parsed.error, {
        region_code: t.common.region,
        units_wanted: t.requestForm.unitsWanted,
      }),
    }
  }
  const values = parsed.data

  const needs = formData.getAll('property_needs').map(String) as PropertyNeed[]
  if (needs.length === 0) {
    return { error: t.requestForm.errNeed }
  }

  if (
    values.budget_total_min !== null &&
    values.budget_total_max !== null &&
    values.budget_total_min > values.budget_total_max
  ) {
    return { error: t.requestForm.errBudget }
  }

  // Le profil participant est mis a jour en meme temps que la demande.
  if (values.professional_body || values.professional_status) {
    await supabase.from('participant_profiles').upsert(
      {
        profile_id: user.id,
        professional_status: values.professional_status || null,
        professional_body: values.professional_body || 'autre',
      },
      { onConflict: 'profile_id' },
    )
  }
  if (values.region_code || values.city_id || values.district) {
    await supabase
      .from('profiles')
      .update({
        region_code: values.region_code || null,
        city_id: values.city_id || null,
        district: values.district || null,
      })
      .eq('id', user.id)
  }

  const title =
    values.title ||
    `${t.enums.propertyNeed[needs[0]]}${
      values.units_wanted ? ` — ${values.units_wanted} ${t.common.units}` : ''
    }`

  const { data, error } = await supabase
    .from('participant_requests')
    .insert({
      participant_id: user.id,
      title,
      notes: values.notes || null,
      region_code: values.region_code || null,
      city_id: values.city_id || null,
      district: values.district || null,
      property_needs: needs,
      budget_total_min: values.budget_total_min,
      budget_total_max: values.budget_total_max,
      budget_per_unit_min: values.budget_per_unit_min,
      budget_per_unit_max: values.budget_per_unit_max,
      units_wanted: values.units_wanted,
      surface_min_m2: values.surface_min_m2,
      surface_max_m2: values.surface_max_m2,
      same_body_preference: values.same_body_preference,
      preferred_body:
        values.same_body_preference === 'oui' ? values.preferred_body || null : null,
      requires_water: checked(formData.get('requires_water')),
      requires_electricity: checked(formData.get('requires_electricity')),
      requires_sewage: checked(formData.get('requires_sewage')),
      status: 'active',
    })
    .select('id')
    .single()

  if (error) return { error: `${t.landForm.errSave} ${error.message}` }

  revalidatePath('/', 'layout')
  return { requestId: data.id as string }
}

/** Met une demande en pause / la réactive. */
export async function setRequestStatus(formData: FormData) {
  const { path } = await getActionTranslation()
  const requestId = formData.get('request_id') as string
  const status = formData.get('status') as string
  if (!['active', 'en_pause', 'satisfaite', 'archivee'].includes(status)) return

  const supabase = await createSupabaseServerClient()
  await supabase.from('participant_requests').update({ status }).eq('id', requestId)

  revalidatePath(path('/mes-demandes'))
  revalidatePath(path(`/mes-demandes/${requestId}`))
}

export async function deleteRequest(formData: FormData) {
  const { path } = await getActionTranslation()
  const requestId = formData.get('request_id') as string
  const supabase = await createSupabaseServerClient()
  await supabase.from('participant_requests').delete().eq('id', requestId)
  revalidatePath(path('/mes-demandes'))
  redirect(path('/mes-demandes'))
}

/** Met à jour le statut d'une correspondance (intéressé / écartée). */
export async function setMatchStatus(formData: FormData) {
  const { path } = await getActionTranslation()
  const matchId = formData.get('match_id') as string
  const requestId = formData.get('request_id') as string
  const status = formData.get('status') as string
  if (!['nouveau', 'vu', 'interesse', 'refuse'].includes(status)) return

  const supabase = await createSupabaseServerClient()
  await supabase
    .from('matches')
    .update({ status, viewed_at: new Date().toISOString() })
    .eq('id', matchId)

  revalidatePath(path(`/mes-demandes/${requestId}`))
}
