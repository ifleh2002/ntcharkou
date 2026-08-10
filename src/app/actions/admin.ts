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
