'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getActionTranslation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function adminClient() {
  const { path } = await getActionTranslation()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(path('/connexion?suivant=/admin'))
  return { supabase, path }
}

/** Décision administrative sur un terrain (section 14). */
export async function reviewLand(formData: FormData) {
  const landId = formData.get('land_id') as string
  const status = formData.get('status') as string
  const reason = (formData.get('reason') as string) || null

  const { supabase, path } = await adminClient()
  await supabase.rpc('admin_review_land', {
    p_land: landId,
    p_status: status,
    p_reason: reason,
  })

  revalidatePath(path('/admin/validations'))
  revalidatePath(path('/admin/terrains'))
  revalidatePath(path(`/admin/terrains/${landId}`))
  revalidatePath(path('/terrains'))
}

/** Décision administrative sur un projet participatif. */
export async function reviewProject(formData: FormData) {
  const projectId = formData.get('project_id') as string
  const status = formData.get('status') as string
  const reason = (formData.get('reason') as string) || null

  const { supabase, path } = await adminClient()
  await supabase.rpc('admin_review_project', {
    p_project: projectId,
    p_status: status,
    p_reason: reason,
  })

  revalidatePath(path('/admin/projets'))
  revalidatePath(path('/admin/validations'))
  revalidatePath(path('/projets'))
}

/** Suspension / rétablissement d'un compte. */
export async function setUserSuspended(formData: FormData) {
  const profileId = formData.get('profile_id') as string
  const suspended = formData.get('suspended') === '1'

  const { supabase, path } = await adminClient()
  await supabase.rpc('admin_set_user_suspended', {
    p_profile: profileId,
    p_suspended: suspended,
  })

  revalidatePath(path('/admin/utilisateurs'))
}

/** Recalcul complet des correspondances. */
export async function rebuildMatches() {
  const { supabase, path } = await adminClient()
  await supabase.rpc('rebuild_all_matches')
  revalidatePath(path('/admin/matching'))
  revalidatePath(path('/admin'))
}

/** Clôture d'un signalement. */
export async function resolveReport(formData: FormData) {
  const reportId = formData.get('report_id') as string
  const { supabase, path } = await adminClient()
  await supabase.rpc('admin_resolve_report', { p_report: reportId })
  revalidatePath(path('/admin/signalements'))
}

/**
 * Transforme un terrain validé en projet participatif.
 *
 * C'est le seul chemin de création : la RLS refuse désormais tout `insert`
 * direct sur `projects` à qui n'est pas administrateur, et la fonction SQL
 * revérifie le rôle de son côté.
 */
export async function createProjectFromLand(formData: FormData): Promise<{ error?: string }> {
  const { supabase, path } = await adminClient()
  const { t } = await getActionTranslation()

  const number = (key: string) => {
    const raw = (formData.get(key) as string | null)?.trim()
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  }

  const units = number('units_planned')
  if (!units || units <= 0) return { error: t.adminProjects.errUnits }

  const { data, error } = await supabase.rpc('admin_create_project_from_land', {
    p_land: formData.get('land_id') as string,
    p_title: (formData.get('title') as string)?.trim(),
    p_units_planned: units,
    p_property_need: formData.get('property_need') as string,
    p_summary: ((formData.get('summary') as string) || '').trim() || null,
    p_description: ((formData.get('description') as string) || '').trim() || null,
    p_unit_surface_m2: number('unit_surface_m2'),
    p_unit_price_per_m2: number('unit_price_per_m2'),
    p_market_price_per_m2: number('market_price_per_m2'),
    p_restricted_to_body: ((formData.get('restricted_to_body') as string) || '') || null,
    p_open: formData.get('open') === '1',
    // Traductions facultatives : vides, le français sert de repli à l'affichage.
    p_title_ar: ((formData.get('title_ar') as string) || '').trim() || null,
    p_summary_ar: ((formData.get('summary_ar') as string) || '').trim() || null,
    p_description_ar: ((formData.get('description_ar') as string) || '').trim() || null,
  })

  if (error) return { error: error.message }

  revalidatePath(path('/admin/projets'))
  revalidatePath(path('/projets'))
  return { error: undefined, ...(typeof data === 'string' ? { projectId: data } : {}) }
}

/** Grille tarifaire fixée « après étude » : unités, surface et prix au m². */
export async function setProjectPricing(formData: FormData): Promise<{ error?: string }> {
  const { supabase, path } = await adminClient()
  const { t } = await getActionTranslation()

  const number = (key: string) => {
    const raw = (formData.get(key) as string | null)?.trim()
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  }

  const units = number('units_planned')
  if (!units || units <= 0) return { error: t.adminProjects.errUnits }

  const projectId = formData.get('project_id') as string
  const { error } = await supabase.rpc('admin_set_project_pricing', {
    p_project: projectId,
    p_units_planned: units,
    p_unit_surface_m2: number('unit_surface_m2'),
    p_unit_price_per_m2: number('unit_price_per_m2'),
    p_market_price_per_m2: number('market_price_per_m2'),
  })

  if (error) return { error: error.message }

  revalidatePath(path('/admin/projets'))
  revalidatePath(path('/projets'))
  revalidatePath(path(`/projets/${projectId}`))
  return {}
}

/**
 * Décision administrative sur une demande d'adhésion.
 * La notification du candidat part du déclencheur SQL, dans la même
 * transaction : une adhésion ne peut pas être validée sans que l'intéressé en
 * soit averti.
 */
export async function decideParticipation(formData: FormData) {
  const participationId = formData.get('participation_id') as string
  const accept = formData.get('accept') === '1'
  const reason = ((formData.get('reason') as string) || '').trim() || null

  const { supabase, path } = await adminClient()
  const { error } = await supabase.rpc('admin_decide_participation', {
    p_participation: participationId,
    p_accept: accept,
    p_reason: reason,
  })

  // Une décision qui échoue en silence est indiscernable d'une décision prise :
  // l'écran se rechargeait à l'identique et le compteur ne bougeait pas, sans
  // que rien ne l'explique. L'erreur remonte donc à l'administration.
  if (error) {
    redirect(`${path('/admin/adhesions')}?erreur=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(path('/admin/projets'))
  revalidatePath(path('/admin/adhesions'))
  revalidatePath(path('/projets'))
  redirect(`${path('/admin/adhesions')}?traite=1`)
}

/** Révision des textes d'un projet, dans les deux langues. */
export async function setProjectTexts(formData: FormData): Promise<{ error?: string }> {
  const { supabase, path } = await adminClient()

  const text = (key: string) => ((formData.get(key) as string) || '').trim() || null
  const title = ((formData.get('title') as string) || '').trim()
  if (!title) return { error: 'L’intitulé est obligatoire.' }

  const projectId = formData.get('project_id') as string
  const { error } = await supabase.rpc('admin_set_project_texts', {
    p_project: projectId,
    p_title: title,
    p_title_ar: text('title_ar'),
    p_summary: text('summary'),
    p_summary_ar: text('summary_ar'),
    p_description: text('description'),
    p_description_ar: text('description_ar'),
  })

  if (error) return { error: error.message }

  revalidatePath(path('/admin/projets'))
  revalidatePath(path('/projets'))
  revalidatePath(path(`/projets/${projectId}`))
  return {}
}
