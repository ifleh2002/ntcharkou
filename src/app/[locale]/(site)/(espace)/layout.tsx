import Link from 'next/link'
import { requireSession } from '@/lib/auth'
import { getTranslation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const { t, path } = await getTranslation()
  const session = await requireSession()

  const supabase = await createSupabaseServerClient()
  const { count: unread } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', session.userId)
    .is('read_at', null)

  const nav = [
    { href: '/tableau-de-bord', label: t.dashboard.navDashboard, icon: '📊' },
    { href: '/mes-demandes', label: t.dashboard.navRequests, icon: '📋' },
    { href: '/mes-terrains', label: t.dashboard.navLands, icon: '🏞️' },
    { href: '/mes-projets', label: t.dashboard.navProjects, icon: '🏗️' },
    { href: '/favoris', label: t.dashboard.navFavorites, icon: '❤️' },
    { href: '/notifications', label: t.dashboard.navNotifications, icon: '🔔' },
    { href: '/profil', label: t.dashboard.navProfile, icon: '👤' },
    { href: '/parametres', label: t.dashboard.navSettings, icon: '⚙️' },
  ]

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[240px_1fr]">
      <nav className="lg:sticky lg:top-24 lg:self-start">
        <ul className="space-y-1">
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                href={path(item.href)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-encre-700 transition-colors hover:bg-sable-200"
              >
                <span aria-hidden>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.href === '/notifications' && (unread ?? 0) > 0 ? (
                  <span className="grid min-w-5 place-items-center rounded-full bg-argile-500 px-1.5 text-xs font-bold text-white">
                    {unread}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0">{children}</div>
    </div>
  )
}
