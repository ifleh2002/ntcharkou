import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui'
import { displayName, requireAdmin } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Back-office totalement séparé de l'espace public (section 2). */
const NAV = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/validations', label: 'Validations', icon: '✅', badge: 'pending' },
  { href: '/admin/terrains', label: 'Terrains', icon: '🏞️' },
  { href: '/admin/demandes', label: 'Demandes', icon: '📋' },
  { href: '/admin/projets', label: 'Projets participatifs', icon: '🏗️' },
  { href: '/admin/matching', label: 'Matching', icon: '🎯' },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: '👥' },
  { href: '/admin/statistiques', label: 'Statistiques / KPI', icon: '📈' },
  { href: '/admin/signalements', label: 'Signalements', icon: '🚩', badge: 'reports' },
] as const

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()
  const supabase = await createSupabaseServerClient()

  const [pending, reports] = await Promise.all([
    supabase
      .from('land_listings')
      .select('id', { count: 'exact', head: true })
      .in('status', ['soumis', 'en_verification']),
    supabase.from('reports').select('id', { count: 'exact', head: true }).is('resolved_at', null),
  ])

  const badges = { pending: pending.count ?? 0, reports: reports.count ?? 0 }

  return (
    <div className="flex min-h-screen bg-encre-900">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 lg:flex">
        <div className="flex items-center gap-2 px-5 py-4">
          <span className="grid size-9 place-items-center rounded-lg bg-argile-500 text-lg font-bold text-white">
            N
          </span>
          <div>
            <p className="text-sm font-bold text-white">Ntcharkou</p>
            <p className="text-xs text-white/50">Back-office</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2">
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <span aria-hidden>{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {'badge' in item && badges[item.badge] > 0 ? (
                    <span className="grid min-w-5 place-items-center rounded-full bg-argile-500 px-1.5 text-xs font-bold text-white">
                      {badges[item.badge]}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-3 py-3">
          <p className="px-2 text-xs text-white/50">Connecté en tant que</p>
          <p className="px-2 text-sm font-medium text-white">{displayName(session.profile)}</p>
          <div className="mt-2 flex gap-1">
            <Link
              href="/"
              className="flex-1 rounded-lg px-2 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10"
            >
              ← Site public
            </Link>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" className="text-white/70 hover:bg-white/10">
                Quitter
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 bg-sable-100">
        <div className="border-b border-sable-300 bg-white px-4 py-3 lg:hidden">
          <details>
            <summary className="cursor-pointer list-none text-sm font-semibold text-encre-900">
              ☰ Back-office
            </summary>
            <nav className="mt-2 flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-encre-700 hover:bg-sable-200"
                >
                  {item.icon} {item.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
      </div>
    </div>
  )
}
