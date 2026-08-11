'use server'

import { revalidatePath } from 'next/cache'
import { getActionTranslation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Retrait d'une candidature par le participant lui-même.
 *
 * Le cycle de vie du projet (analyse, ouverture, annulation) appartient
 * désormais à l'administration : la RLS refuse tout `update` sur `projects` à
 * qui n'est pas administrateur, il n'y a donc plus d'action utilisateur ici.
 */
export async function withdrawApplication(formData: FormData) {
  const { path } = await getActionTranslation()
  const projectId = formData.get('project_id') as string
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('project_participants')
    .update({ status: 'retire' })
    .eq('project_id', projectId)
    .eq('participant_id', user.id)

  revalidatePath(path('/mes-projets'))
  revalidatePath(path(`/projets/${projectId}`))
}
