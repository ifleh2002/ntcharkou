'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getActionTranslation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { firstIssueMessage } from './validation'
import type { ProfessionalBody, PropertyNeed } from '@/lib/types'

export interface ProjectActionResult {
  error?: string
  projectId?: string
}

const optionalNumber = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : Number(value)))
  .refine((value) => value === null || Number.isFinite(value), 'Valeur numérique invalide')

const projectSchema = z.object({
  title: z.string().trim().optional().default(''),
  summary: z.string().trim().optional().default(''),
  description: z.string().trim().optional().default(''),
  region_code: z.string().trim().min(1, 'La région est obligatoire'),
  city_id: z.string().trim().optional().default(''),
  district: z.string().trim().optional().default(''),
  property_need: z.string().trim().min(1, 'La typologie est obligatoire'),
  zoning: z.string().trim().optional().default(''),
  units_planned: z
    .string()
    .trim()
    .min(1, 'Le nombre de logements est obligatoire')
    .transform(Number)
    .refine((value) => Number.isInteger(value) && value > 0, 'Nombre de logements invalide'),
  participants_target: z
    .string()
    .trim()
    .min(1, 'Le nombre de participants recherchés est obligatoire')
    .transform(Number)
    .refine((value) => Number.isInteger(value) && value > 0, 'Nombre de participants invalide'),
  budget_per_unit: optionalNumber,
  restricted_to_body: z.string().trim().optional().default(''),
  land_id: z.string().trim().optional().default(''),
})

/** « Créer mon groupe » (section 26). Le projet part en statut « proposition ». */
export async function createProject(formData: FormData): Promise<ProjectActionResult> {
  const supabase = await createSupabaseServerClient()
  const { t } = await getActionTranslation()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: t.auth.errCredentials }

  const parsed = projectSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      error: firstIssueMessage(t, parsed.error, {
        region_code: t.common.region,
        property_need: t.projectForm.housingType,
        units_planned: t.projectForm.unitsPlanned,
        participants_target: t.projectForm.participantsTarget,
      }),
    }
  }
  const values = parsed.data

  const body = (values.restricted_to_body || null) as ProfessionalBody | null
  const need = values.property_need as PropertyNeed

  const label = body ? t.enums.professionalBodyPlural[body] : t.enums.propertyNeed[need]
  const title = values.title || `${label} — ${values.units_planned} ${t.common.units}`

  const { data, error } = await supabase
    .from('projects')
    .insert({
      created_by: user.id,
      title,
      summary: values.summary || null,
      description: values.description || null,
      region_code: values.region_code,
      city_id: values.city_id || null,
      district: values.district || null,
      property_need: need,
      zoning: values.zoning || null,
      units_planned: values.units_planned,
      participants_target: values.participants_target,
      budget_per_unit: values.budget_per_unit,
      restricted_to_body: body,
      land_id: values.land_id || null,
      status: 'proposition',
    })
    .select('id')
    .single()

  if (error) return { error: `${t.projectForm.errCreate} ${error.message}` }

  // Le porteur du groupe en est le premier membre confirmé.
  await supabase.from('project_participants').insert({
    project_id: data.id,
    participant_id: user.id,
    units_wanted: 1,
    status: 'accepte',
  })

  revalidatePath('/', 'layout')
  return { projectId: data.id as string }
}

/** Soumet une proposition de groupe à l'analyse de l'administration. */
export async function submitProject(formData: FormData) {
  const { path } = await getActionTranslation()
  const projectId = formData.get('project_id') as string
  const supabase = await createSupabaseServerClient()
  await supabase.from('projects').update({ status: 'analyse' }).eq('id', projectId)
  revalidatePath(path('/mes-projets'))
  revalidatePath(path(`/mes-projets/${projectId}`))
}

export async function cancelProject(formData: FormData) {
  const { path } = await getActionTranslation()
  const projectId = formData.get('project_id') as string
  const supabase = await createSupabaseServerClient()
  await supabase.from('projects').update({ status: 'annule' }).eq('id', projectId)
  revalidatePath(path('/mes-projets'))
  revalidatePath(path(`/mes-projets/${projectId}`))
}
