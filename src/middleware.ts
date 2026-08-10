import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/** Routes exigeant une session. */
const PROTECTED_PREFIXES = [
  '/tableau-de-bord',
  '/profil',
  '/mes-demandes',
  '/mes-terrains',
  '/mes-projets',
  '/favoris',
  '/notifications',
  '/parametres',
  '/admin',
]

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return response

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  // Rafraichit le jeton et synchronise les cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const needsAuth = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))

  if (needsAuth && !user) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/connexion'
    redirect.searchParams.set('suivant', path)
    return NextResponse.redirect(redirect)
  }

  if (path.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_suspended')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || profile.role !== 'admin' || profile.is_suspended) {
      const redirect = request.nextUrl.clone()
      redirect.pathname = '/tableau-de-bord'
      redirect.search = ''
      return NextResponse.redirect(redirect)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
