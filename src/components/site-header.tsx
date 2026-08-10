import Link from 'next/link'
import { getSessionContext } from '@/lib/auth'
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { LinkButton } from './ui'
import { LogoutButton } from './logout-button'

const PUBLIC_LINKS = [
  { href: '/terrains', label: 'Terrains' },
  { href: '/projets', label: 'Projets participatifs' },
  { href: '/comment-ca-marche', label: 'Comment ça marche ?' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
]

async function unreadCount(userId: string) {
  if (!isSupabaseConfigured()) return 0
  const supabase = await createSupabaseServerClient()
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', userId)
    .is('read_at', null)
  return count ?? 0
}

export async function SiteHeader() {
  const session = await getSessionContext()
  const unread = session ? await unreadCount(session.userId) : 0

  return (
    <header className="sticky top-0 z-40 border-b border-sable-300 bg-sable-50/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-argile-500 text-lg font-bold text-white">
            N
          </span>
          <span className="hidden text-lg font-bold tracking-tight text-encre-900 sm:block">
            Ntcharkou
          </span>
        </Link>

        <nav className="ml-2 hidden flex-1 items-center gap-1 lg:flex">
          {PUBLIC_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-encre-700 transition-colors hover:bg-sable-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {session ? (
            <>
              <Link
                href="/notifications"
                className="relative rounded-lg px-2.5 py-2 text-lg transition-colors hover:bg-sable-200"
                aria-label={`Notifications${unread > 0 ? ` (${unread} non lues)` : ''}`}
              >
                🔔
                {unread > 0 ? (
                  <span className="absolute top-0.5 right-0.5 grid min-w-4 place-items-center rounded-full bg-argile-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
              </Link>
              {session.profile.role === 'admin' ? (
                <LinkButton href="/admin" variant="ghost" size="sm">
                  🛡️ Back-office
                </LinkButton>
              ) : null}
              <LinkButton href="/tableau-de-bord" variant="secondary" size="sm">
                Mon espace
              </LinkButton>
              <LogoutButton />
            </>
          ) : (
            <>
              <LinkButton href="/connexion" variant="ghost" size="sm">
                Connexion
              </LinkButton>
              <LinkButton href="/inscription" size="sm">
                Inscription
              </LinkButton>
            </>
          )}
        </div>
      </div>

      {/* Navigation repliable sur mobile — sans JavaScript */}
      <details className="border-t border-sable-300 lg:hidden">
        <summary className="cursor-pointer list-none px-4 py-2 text-sm font-medium text-encre-700">
          ☰ Menu
        </summary>
        <nav className="flex flex-col gap-1 px-4 pb-3">
          {PUBLIC_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-encre-700 hover:bg-sable-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </details>
    </header>
  )
}
