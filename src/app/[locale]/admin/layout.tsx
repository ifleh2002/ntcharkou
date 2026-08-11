import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Button } from '@/components/ui'
import { displayName, requireAdmin } from '@/lib/auth'
import { getTranslation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { locale, t, path } = await getTranslation()
  const session = await requireAdmin()
  const supabase = await createSupabaseServerClient()

  const [pending, reports, memberships] = await Promise.all([
    supabase
      .from('land_listings')
      .select('id', { count: 'exact', head: true })
      .in('status', ['soumis', 'en_verification']),
    supabase.from('reports').select('id', { count: 'exact', head: true }).is('resolved_at', null),
    supabase
      .from('project_participants')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'candidature'),
  ])

  /** Back-office totalement séparé de l'espace public (section 2). */
  const nav = [
    { href: '/admin', label: t.admin.navDashboard, icon: '📊', badge: 0 },
    {
      href: '/admin/validations',
      label: t.admin.navValidations,
      icon: '✅',
      badge: pending.count ?? 0,
    },
    { href: '/admin/terrains', label: t.admin.navLands, icon: '🏞️', badge: 0 },
    { href: '/admin/demandes', label: t.admin.navRequests, icon: '📋', badge: 0 },
    { href: '/admin/projets', label: t.admin.navProjects, icon: '🏗️', badge: 0 },
    {
      href: '/admin/adhesions',
      label: t.admin.navMemberships,
      icon: '🤝',
      badge: memberships.count ?? 0,
    },
    { href: '/admin/matching', label: t.admin.navMatching, icon: '🎯', badge: 0 },
    { href: '/admin/utilisateurs', label: t.admin.navUsers, icon: '👥', badge: 0 },
    { href: '/admin/statistiques', label: t.admin.navStats, icon: '📈', badge: 0 },
    {
      href: '/admin/signalements',
      label: t.admin.navReports,
      icon: '🚩',
      badge: reports.count ?? 0,
    },
  ]

  return (
    <div className="flex min-h-screen bg-encre-900">
      <aside className="hidden w-60 shrink-0 flex-col border-e border-white/10 lg:flex">
        <div className="flex items-center gap-2 px-5 py-4">
          <span className="grid size-9 place-items-center rounded-lg bg-argile-500 text-lg font-bold text-white">
            N
          </span>
          <div>
            <p className="text-sm font-bold text-white">Ntcharkou</p>
            <p className="text-xs text-white/50">{t.admin.backOffice}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2">
          <ul className="space-y-0.5">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={path(item.href)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <span aria-hidden>{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge > 0 ? (
                    <span className="grid min-w-5 place-items-center rounded-full bg-argile-500 px-1.5 text-xs font-bold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-3 py-3">
          <p className="px-2 text-xs text-white/50">{t.admin.connectedAs}</p>
          <p className="px-2 text-sm font-medium text-white">{displayName(session.profile)}</p>
          <div className="mt-3 px-2">
            <LanguageSwitcher locale={locale} label={t.meta.switchLabel} variant="dark" />
          </div>
          <div className="mt-2 flex gap-1">
            <Link
              href={path('/')}
              className="flex-1 rounded-lg px-2 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10"
            >
              ← {t.admin.publicSite}
            </Link>
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-white/70 hover:bg-white/10"
              >
                {t.admin.leave}
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 bg-sable-100">
        <div className="border-b border-sable-300 bg-white px-4 py-3 lg:hidden">
          <details>
            <summary className="cursor-pointer list-none text-sm font-semibold text-encre-900">
              ☰ {t.admin.backOffice}
            </summary>
            <nav className="mt-2 flex flex-col gap-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={path(item.href)}
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
