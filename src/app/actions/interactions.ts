'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

/** Ajoute / retire un terrain ou un projet des favoris. */
export async function toggleFavorite(formData: FormData) {
  const landId = (formData.get('land_id') as string) || null
  const projectId = (formData.get('project_id') as string) || null
  const returnTo = (formData.get('return_to') as string) || '/favoris'

  const { supabase, user } = await requireUser()
  if (!user) redirect(`/connexion?suivant=${encodeURIComponent(returnTo)}`)

  const column = landId ? 'land_id' : 'project_id'
  const value = landId ?? projectId
  if (!value) return

  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('profile_id', user.id)
    .eq(column, value)
    .maybeSingle()

  if (existing) {
    await supabase.from('favorites').delete().eq('id', existing.id)
  } else {
    await supabase.from('favorites').insert({
      profile_id: user.id,
      land_id: landId,
      project_id: projectId,
    })
  }

  revalidatePath(returnTo)
  revalidatePath('/favoris')
}

/** « Je suis intéressé » depuis la fiche terrain. */
export async function expressInterest(formData: FormData) {
  const landId = formData.get('land_id') as string
  const message = (formData.get('message') as string) || null
  const returnTo = (formData.get('return_to') as string) || `/terrains/${landId}`

  const { supabase, user } = await requireUser()
  if (!user) redirect(`/connexion?suivant=${encodeURIComponent(returnTo)}`)

  await supabase.rpc('express_interest', { p_land: landId, p_message: message })
  revalidatePath(returnTo)
  redirect(`${returnTo}?interet=1`)
}

/** Candidature à un projet participatif. */
export async function joinProject(formData: FormData) {
  const projectId = formData.get('project_id') as string
  const units = Number(formData.get('units_wanted') ?? 1)
  const message = (formData.get('message') as string) || null
  const returnTo = `/projets/${projectId}`

  const { supabase, user } = await requireUser()
  if (!user) redirect(`/connexion?suivant=${encodeURIComponent(returnTo)}`)

  const { error } = await supabase.from('project_participants').insert({
    project_id: projectId,
    participant_id: user.id,
    units_wanted: Number.isFinite(units) && units > 0 ? units : 1,
    message,
  })

  revalidatePath(returnTo)
  redirect(error ? `${returnTo}?erreur=candidature` : `${returnTo}?candidature=1`)
}

/** Retrait d'une candidature. */
export async function leaveProject(formData: FormData) {
  const projectId = formData.get('project_id') as string
  const { supabase, user } = await requireUser()
  if (!user) redirect('/connexion')

  await supabase
    .from('project_participants')
    .delete()
    .eq('project_id', projectId)
    .eq('participant_id', user.id)

  revalidatePath(`/projets/${projectId}`)
}

/** Décision du porteur de projet sur une candidature. */
export async function decideParticipation(formData: FormData) {
  const participationId = formData.get('participation_id') as string
  const projectId = formData.get('project_id') as string
  const decision = formData.get('decision') as string
  if (!['accepte', 'refuse'].includes(decision)) return

  const { supabase, user } = await requireUser()
  if (!user) redirect('/connexion')

  await supabase
    .from('project_participants')
    .update({ status: decision, decided_at: new Date().toISOString(), decided_by: user.id })
    .eq('id', participationId)

  revalidatePath(`/mes-projets/${projectId}`)
  revalidatePath(`/projets/${projectId}`)
}

/** Marque toutes les notifications comme lues. */
export async function markAllNotificationsRead() {
  const { supabase, user } = await requireUser()
  if (!user) redirect('/connexion')
  await supabase.rpc('mark_all_notifications_read')
  revalidatePath('/notifications')
  revalidatePath('/', 'layout')
}

/** Signalement d'une annonce. */
export async function reportListing(formData: FormData) {
  const landId = (formData.get('land_id') as string) || null
  const projectId = (formData.get('project_id') as string) || null
  const reason = formData.get('reason') as string
  const details = (formData.get('details') as string) || null
  const returnTo = (formData.get('return_to') as string) || '/'

  const { supabase, user } = await requireUser()
  if (!user) redirect(`/connexion?suivant=${encodeURIComponent(returnTo)}`)

  await supabase.from('reports').insert({
    reporter_id: user.id,
    land_id: landId,
    project_id: projectId,
    reason,
    details,
  })

  redirect(`${returnTo}?signalement=1`)
}
