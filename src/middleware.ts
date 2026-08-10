import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import {
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isLocale,
  localeFromAcceptLanguage,
  stripLocale,
  type Locale,
} from '@/lib/i18n/config'

/** Routes exigeant une session, exprimées sans préfixe de langue. */
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

/** Langue à retenir quand l'URL n'en porte pas : cookie, puis navigateur. */
function preferredLocale(request: NextRequest): Locale {
  const fromCookie = request.cookies.get(LOCALE_COOKIE)?.value
  if (isLocale(fromCookie)) return fromCookie
  return localeFromAcceptLanguage(request.headers.get('accept-language'))
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const { locale: urlLocale, path } = stripLocale(pathname)

  // --- 1. Toute URL sans préfixe de langue est redirigée vers sa version
  //        localisée : une seule forme canonique par page.
  if (!urlLocale) {
    const target = request.nextUrl.clone()
    const chosen = preferredLocale(request)
    target.pathname = `/${chosen}${pathname === '/' ? '' : pathname}`
    return NextResponse.redirect(target)
  }

  const locale = urlLocale

  // L'en-tête permet aux composants serveur partagés de connaître la langue.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(LOCALE_HEADER, locale)

  let response = NextResponse.next({ request: { headers: requestHeaders } })

  // Mémorise la langue choisie pour les visites suivantes.
  if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }

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
        response = NextResponse.next({ request: { headers: requestHeaders } })
        response.cookies.set(LOCALE_COOKIE, locale, {
          path: '/',
          maxAge: 60 * 60 * 24 * 365,
          sameSite: 'lax',
        })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  // Rafraichit le jeton et synchronise les cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const needsAuth = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))

  if (needsAuth && !user) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = `/${locale}/connexion`
    redirect.search = ''
    redirect.searchParams.set('suivant', `${path}${search}`)
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
      redirect.pathname = `/${locale}/tableau-de-bord`
      redirect.search = ''
      return NextResponse.redirect(redirect)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
