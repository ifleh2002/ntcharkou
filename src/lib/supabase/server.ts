import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

function readEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      "Configuration Supabase manquante : renseignez NEXT_PUBLIC_SUPABASE_URL et " +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY (voir .env.example).',
    )
  }
  return { url, key }
}

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

/**
 * Client Supabase pour les Server Components, Server Actions et Route Handlers.
 * Les cookies de session sont rafraichis par le middleware ; l'ecriture depuis
 * un Server Component est simplement ignoree (comportement recommande).
 */
export async function createSupabaseServerClient() {
  const { url, key } = readEnv()
  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Appel depuis un Server Component : le middleware s'en charge.
        }
      },
    },
  })
}

/**
 * Client "service_role" — contourne la RLS. Reserve aux traitements serveur
 * qui en ont strictement besoin. Ne jamais l'utiliser dans du code client.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante.')
  }
  return createServerClient(url, serviceKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  })
}
