import Link from 'next/link'
import { getSessionContext } from '@/lib/auth'
import { getTranslation } from '@/lib/i18n/server'
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { LanguageSwitcher } from './language-switcher'
import { LogoutButton } from './logout-button'
import { LinkButton } from './ui'

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
  const { locale, t, path } = await getTranslation()
  const session = await getSessionContext()
  const unread = session ? await unreadCount(session.userId) : 0

  const links = [
    { href: '/terrains', label: t.nav.lands },
    { href: '/projets', label: t.nav.projects },
    { href: '/comment-ca-marche', label: t.nav.howItWorks },
    { href: '/faq', label: t.nav.faq },
    { href: '/contact', label: t.nav.contact },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-sable-300 bg-sable-50/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href={path('/')} className="flex shrink-0 items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-argile-500 text-lg font-bold text-white">
            N
          </span>
          <span className="hidden text-lg font-bold tracking-tight text-encre-900 sm:block">
            Ntcharkou
          </span>
        </Link>

        <nav className="ms-2 hidden flex-1 items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={path(link.href)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-encre-700 transition-colors hover:bg-sable-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <LanguageSwitcher locale={locale} label={t.meta.switchLabel} />

          {/* La cloche reste toujours visible : c'est le seul point d'entree
              vers une information qui vient d'arriver. */}
          {session ? (
            <Link
              href={path('/notifications')}
              className="relative rounded-lg px-2.5 py-2 text-lg transition-colors hover:bg-sable-200"
              aria-label={
                unread > 0
                  ? `${t.nav.notifications} (${unread} ${t.nav.unreadNotifications})`
                  : t.nav.notifications
              }
            >
              🔔
              {unread > 0 ? (
                <span className="absolute top-0.5 end-0.5 grid min-w-4 place-items-center rounded-full bg-argile-500 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              ) : null}
            </Link>
          ) : null}

          {/* En dessous de 640 px, ces boutons ne tiennent pas sur la ligne :
              ils rejoignent le menu repliable plus bas. */}
          <div className="hidden items-center gap-2 sm:flex">
            {session ? (
              <>
                {session.profile.role === 'admin' ? (
                  <LinkButton href={path('/admin')} variant="ghost" size="sm">
                    🛡️ {t.nav.backOffice}
                  </LinkButton>
                ) : null}
                <LinkButton href={path('/tableau-de-bord')} variant="secondary" size="sm">
                  {t.nav.mySpace}
                </LinkButton>
                <LogoutButton label={t.nav.logout} />
              </>
            ) : (
              <>
                <LinkButton href={path('/connexion')} variant="ghost" size="sm">
                  {t.nav.login}
                </LinkButton>
                <LinkButton href={path('/inscription')} size="sm">
                  {t.nav.signup}
                </LinkButton>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Navigation repliable sur mobile — sans JavaScript */}
      <details className="border-t border-sable-300 lg:hidden">
        <summary className="cursor-pointer list-none px-4 py-2 text-sm font-medium text-encre-700">
          ☰ {t.nav.menu}
        </summary>
        <nav className="flex flex-col gap-1 px-4 pb-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={path(link.href)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-encre-700 hover:bg-sable-200"
            >
              {link.label}
            </Link>
          ))}

          {/* Reprise des acces au compte, masques dans la barre sous 640 px. */}
          <span className="mt-2 flex flex-wrap gap-2 border-t border-sable-200 pt-3 sm:hidden">
            {session ? (
              <>
                {session.profile.role === 'admin' ? (
                  <LinkButton href={path('/admin')} variant="ghost" size="sm">
                    🛡️ {t.nav.backOffice}
                  </LinkButton>
                ) : null}
                <LinkButton href={path('/tableau-de-bord')} variant="secondary" size="sm">
                  {t.nav.mySpace}
                </LinkButton>
                <LogoutButton label={t.nav.logout} />
              </>
            ) : (
              <>
                <LinkButton href={path('/connexion')} variant="ghost" size="sm">
                  {t.nav.login}
                </LinkButton>
                <LinkButton href={path('/inscription')} size="sm">
                  {t.nav.signup}
                </LinkButton>
              </>
            )}
          </span>
        </nav>
      </details>
    </header>
  )
}
