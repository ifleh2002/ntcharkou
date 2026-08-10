'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function adminClient() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/connexion?suivant=/admin')
  return supabase
}

/** Décision administrative sur un terrain (section 14). */
export async function reviewLand(formData: FormData) {
  const landId = formData.get('land_id') as string
  const status = formData.get('status') as string
  const reason = (formData.get('reason') as string) || null

  const supabase = await adminClient()
  await supabase.rpc('admin_review_land', {
    p_land: landId,
    p_status: status,
    p_reason: reason,
  })

  revalidatePath('/admin/validations')
  revalidatePath('/admin/terrains')
  revalidatePath(`/admin/terrains/${landId}`)
  revalidatePath('/terrains')
}

/** Décision administrative sur un projet participatif. */
export async function reviewProject(formData: FormData) {
  const projectId = formData.get('project_id') as string
  const status = formData.get('status') as string
  const reason = (formData.get('reason') as string) || null

  const supabase = await adminClient()
  await supabase.rpc('admin_review_project', {
    p_project: projectId,
    p_status: status,
    p_reason: reason,
  })

  revalidatePath('/admin/projets')
  revalidatePath('/admin/validations')
  revalidatePath('/projets')
}

/** Suspension / rétablissement d'un compte. */
export async function setUserSuspended(formData: FormData) {
  const profileId = formData.get('profile_id') as string
  const suspended = formData.get('suspended') === '1'

  const supabase = await adminClient()
  await supabase.rpc('admin_set_user_suspended', {
    p_profile: profileId,
    p_suspended: suspended,
  })

  revalidatePath('/admin/utilisateurs')
}

/** Recalcul complet des correspondances. */
export async function rebuildMatches() {
  const supabase = await adminClient()
  await supabase.rpc('rebuild_all_matches')
  revalidatePath('/admin/matching')
  revalidatePath('/admin')
}

/** Clôture d'un signalement. */
export async function resolveReport(formData: FormData) {
  const reportId = formData.get('report_id') as string
  const supabase = await adminClient()
  await supabase.rpc('admin_resolve_report', { p_report: reportId })
  revalidatePath('/admin/signalements')
}
