'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getActionTranslation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface ActionState {
  error?: string
  success?: string
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('suivant') ?? '/tableau-de-bord')
  const { t, path } = await getActionTranslation()

  if (!email || !password) {
    return { error: t.auth.errMissing }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: t.auth.errCredentials }
  }

  revalidatePath('/', 'layout')
  redirect(path(next.startsWith('/') ? next : '/tableau-de-bord'))
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const firstName = String(formData.get('first_name') ?? '').trim()
  const lastName = String(formData.get('last_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const role = String(formData.get('role') ?? 'participant')
  const terms = formData.get('terms')

  const { t, path, locale } = await getActionTranslation()

  if (!firstName || !lastName) return { error: t.auth.errName }
  if (!email) return { error: t.auth.errEmail }
  if (password.length < 8) return { error: t.auth.errPassword }
  if (!terms) return { error: t.auth.errTerms }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        phone,
        role: role === 'owner' ? 'owner' : 'participant',
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/${locale}/tableau-de-bord`,
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return { error: t.auth.errExists }
    }
    return { error: error.message }
  }

  // Selon la configuration Supabase, la session peut necessiter une
  // confirmation par email : on redirige alors vers la page de connexion.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  revalidatePath('/', 'layout')
  if (user) redirect(path('/tableau-de-bord'))
  return { success: t.auth.signupOk }
}

export async function signOut() {
  const supabase = await createSupabaseServerClient()
  const { path } = await getActionTranslation()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect(path('/'))
}
