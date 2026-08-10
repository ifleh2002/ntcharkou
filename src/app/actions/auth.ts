'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface ActionState {
  error?: string
  success?: string
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('suivant') ?? '/tableau-de-bord')

  if (!email || !password) {
    return { error: 'Renseignez votre email et votre mot de passe.' }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Identifiants incorrects. Vérifiez votre email et votre mot de passe.' }
  }

  revalidatePath('/', 'layout')
  redirect(next.startsWith('/') ? next : '/tableau-de-bord')
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const firstName = String(formData.get('first_name') ?? '').trim()
  const lastName = String(formData.get('last_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const role = String(formData.get('role') ?? 'participant')
  const terms = formData.get('terms')

  if (!firstName || !lastName) return { error: 'Renseignez votre nom et votre prénom.' }
  if (!email) return { error: 'Renseignez votre adresse email.' }
  if (password.length < 8) return { error: 'Le mot de passe doit contenir au moins 8 caractères.' }
  if (!terms) return { error: 'Vous devez accepter les conditions d’utilisation.' }

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
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/tableau-de-bord`,
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return { error: 'Un compte existe déjà avec cette adresse email.' }
    }
    return { error: `Inscription impossible : ${error.message}` }
  }

  // Selon la configuration Supabase, la session peut necessiter une
  // confirmation par email : on redirige alors vers la page de connexion.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  revalidatePath('/', 'layout')
  if (user) redirect('/tableau-de-bord')
  return { success: 'Compte créé. Confirmez votre adresse email puis connectez-vous.' }
}

export async function signOut() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
