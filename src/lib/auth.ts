import { redirect } from 'next/navigation'
import { createSupabaseServerClient, isSupabaseConfigured } from './supabase/server'
import type { Profile } from './types'

export interface SessionContext {
  userId: string
  email: string | null
  profile: Profile
}

/** Retourne l'utilisateur courant et son profil, ou null si non connecte. */
export async function getSessionContext(): Promise<SessionContext | null> {
  if (!isSupabaseConfigured()) return null

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Profile>()

  if (!profile) return null

  return { userId: user.id, email: user.email ?? null, profile }
}

/** Variante bloquante pour les pages de l'espace utilisateur. */
export async function requireSession(nextPath?: string): Promise<SessionContext> {
  const session = await getSessionContext()
  if (!session) {
    redirect(nextPath ? `/connexion?suivant=${encodeURIComponent(nextPath)}` : '/connexion')
  }
  return session
}

export async function requireAdmin(): Promise<SessionContext> {
  const session = await requireSession('/admin')
  if (session.profile.role !== 'admin') {
    redirect('/tableau-de-bord')
  }
  return session
}

export function displayName(profile: Pick<Profile, 'first_name' | 'last_name'>) {
  const name = `${profile.first_name} ${profile.last_name}`.trim()
  return name || 'Utilisateur'
}

/** Taux de completion du profil affiche sur le tableau de bord (section 25). */
export function profileCompletion(profile: Profile): number {
  const checks = [
    profile.first_name,
    profile.last_name,
    profile.email,
    profile.phone,
    profile.region_code,
    profile.city_id,
    profile.district,
  ]
  const filled = checks.filter((value) => value !== null && value !== '').length
  return Math.round((filled / checks.length) * 100)
}
