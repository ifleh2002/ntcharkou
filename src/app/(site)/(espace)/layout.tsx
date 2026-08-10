import Link from 'next/link'
import { requireSession } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const NAV = [
  { href: '/tableau-de-bord', label: 'Mon tableau de bord', icon: '📊' },
  { href: '/mes-demandes', label: 'Mes demandes', icon: '📋' },
  { href: '/mes-terrains', label: 'Mes terrains proposés', icon: '🏞️' },
  { href: '/mes-projets', label: 'Mes projets', icon: '🏗️' },
  { href: '/favoris', label: 'Mes favoris', icon: '❤️' },
  { href: '/notifications', label: 'Mes notifications', icon: '🔔' },
  { href: '/profil', label: 'Mon profil', icon: '👤' },
  { href: '/parametres', label: 'Paramètres du compte', icon: '⚙️' },
]

export const dynamic = 'force-dynamic'

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  const supabase = await createSupabaseServerClient()
  const { count: unread } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', session.userId)
    .is('read_at', null)

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[240px_1fr]">
      <nav className="lg:sticky lg:top-24 lg:self-start">
        <ul className="space-y-1">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
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
