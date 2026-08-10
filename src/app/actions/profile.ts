'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getActionTranslation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Mise à jour du profil (espace utilisateur). */
export async function updateProfile(formData: FormData) {
  const { path } = await getActionTranslation()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(path('/connexion'))

  await supabase
    .from('profiles')
    .update({
      first_name: String(formData.get('first_name') ?? '').trim(),
      last_name: String(formData.get('last_name') ?? '').trim(),
      phone: String(formData.get('phone') ?? '').trim() || null,
      email: String(formData.get('email') ?? '').trim() || null,
      region_code: String(formData.get('region_code') ?? '') || null,
      city_id: String(formData.get('city_id') ?? '') || null,
      district: String(formData.get('district') ?? '').trim() || null,
    })
    .eq('id', user.id)

  const professionalBody = String(formData.get('professional_body') ?? '')
  if (professionalBody) {
    await supabase.from('participant_profiles').upsert(
      {
        profile_id: user.id,
        professional_body: professionalBody,
        professional_status: String(formData.get('professional_status') ?? '').trim() || null,
        employer: String(formData.get('employer') ?? '').trim() || null,
      },
      { onConflict: 'profile_id' },
    )
  }

  const ownerKind = String(formData.get('owner_kind') ?? '')
  if (ownerKind) {
    await supabase.from('owner_profiles').upsert(
      {
        profile_id: user.id,
        owner_kind: ownerKind,
        company_name: String(formData.get('company_name') ?? '').trim() || null,
        cin_number: String(formData.get('cin_number') ?? '').trim() || null,
      },
      { onConflict: 'profile_id' },
    )
  }

  revalidatePath(path('/profil'))
  revalidatePath(path('/tableau-de-bord'))
  redirect(path('/profil?enregistre=1'))
}

/** Changement de mot de passe. */
export async function updatePassword(formData: FormData) {
  const { path } = await getActionTranslation()
  const password = String(formData.get('password') ?? '')
  if (password.length < 8) redirect(path('/parametres?erreur=mot_de_passe'))

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password })
  redirect(path(error ? '/parametres?erreur=mot_de_passe' : '/parametres?enregistre=1'))
}
