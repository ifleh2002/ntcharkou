import type { Metadata } from 'next'
import Link from 'next/link'
import { LandCard } from '@/components/land-card'
import { Card, EmptyState, LinkButton, ProgressBar, SectionTitle, StatCard } from '@/components/ui'
import { displayName, profileCompletion, requireSession } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { LandListingPublic } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: getDictionary(resolveLocale(locale)).dashboard.title }
}

interface MatchRow {
  id: string
  score: number
  created_at: string
  land_id: string
  request_id: string
}

export default async function TableauDeBordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const tr = translation(locale)
  const { t, f, path } = tr

  const session = await requireSession('/tableau-de-bord')
  const supabase = await createSupabaseServerClient()

  const [favorites, requests, lands, projects, notifications, matches] = await Promise.all([
    supabase
      .from('favorites')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', session.userId),
    supabase
      .from('participant_requests')
      .select('id', { count: 'exact', head: true })
      .eq('participant_id', session.userId)
      .eq('status', 'active'),
    supabase
      .from('land_listings')
      .select('id, status', { count: 'exact' })
      .eq('owner_id', session.userId),
    supabase
      .from('project_participants')
      .select('id', { count: 'exact', head: true })
      .eq('participant_id', session.userId),
    supabase
      .from('notifications')
      .select('id, title, body, url, created_at, read_at')
      .eq('profile_id', session.userId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('matches')
      .select('id, score, created_at, land_id, request_id')
      .order('score', { ascending: false })
      .limit(4)
      .returns<MatchRow[]>(),
  ])

  const landIds = (matches.data ?? []).map((m) => m.land_id)
  let matchedLands: LandListingPublic[] = []
  if (landIds.length > 0) {
    const { data } = await supabase.from('land_listings_public').select('*').in('id', landIds)
    matchedLands = (data ?? []) as LandListingPublic[]
  }

  const completion = profileCompletion(session.profile)
  const unreadCount = (notifications.data ?? []).filter((n) => !n.read_at).length
  const publishedLands = (lands.data ?? []).filter((l) => l.status === 'publie').length
  const pendingLands = (lands.data ?? []).filter((l) =>
    ['soumis', 'en_verification', 'valide'].includes(l.status),
  ).length

  const shortcuts = [
    { href: '/mes-terrains/nouveau', icon: '🏞️', title: t.dashboard.shortcutLand },
    { href: '/mes-demandes/nouvelle', icon: '📋', title: t.dashboard.shortcutRequest },
    { href: '/projets', icon: '👥', title: t.dashboard.shortcutGroup },
  ]

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-encre-900">
          {t.dashboard.hello} {displayName(session.profile).split(' ')[0]} 👋
        </h1>
        <div className="mt-3 max-w-md">
          <p className="mb-1.5 text-sm text-encre-500">
            {t.dashboard.completion} {completion} %
          </p>
          <ProgressBar value={completion} max={100} tone="argile" />
          {completion < 100 ? (
            <Link
              href={path('/profil')}
              className="mt-1.5 inline-block text-sm font-semibold text-argile-600"
            >
              {t.dashboard.completeProfile}
            </Link>
          ) : null}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`❤️ ${t.dashboard.statFavorites}`} value={favorites.count ?? 0} />
        <StatCard
          label={`🔔 ${t.dashboard.statMatches}`}
          value={matches.data?.length ?? 0}
          hint={unreadCount > 0 ? `${unreadCount} ${t.dashboard.notificationsHint}` : undefined}
          tone="argile"
        />
        <StatCard label={`🏗️ ${t.dashboard.statProjects}`} value={projects.count ?? 0} />
        <StatCard label={`📋 ${t.dashboard.statRequests}`} value={requests.count ?? 0} />
      </section>

      {(lands.count ?? 0) > 0 ? (
        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          <StatCard label={`🏞️ ${t.dashboard.statPublished}`} value={publishedLands} />
          <StatCard
            label={`⏳ ${t.dashboard.statPending}`}
            value={pendingLands}
            hint={pendingLands > 0 ? t.dashboard.pendingHint : undefined}
            tone="alerte"
          />
        </section>
      ) : null}

      <section className="mt-10">
        <SectionTitle
          title={t.dashboard.opportunities}
          subtitle={t.dashboard.opportunitiesLead}
          action={
            <LinkButton href={path('/mes-demandes')} variant="ghost" size="sm">
              {t.dashboard.seeRequests}
            </LinkButton>
          }
        />
        {matchedLands.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {(matches.data ?? []).map((match) => {
              const land = matchedLands.find((l) => l.id === match.land_id)
              if (!land) return null
              return <LandCard key={match.id} land={land} tr={tr} score={match.score} />
            })}
          </div>
        ) : (
          <EmptyState
            icon="🎯"
            title={t.dashboard.noOpportunityTitle}
            description={t.dashboard.noOpportunityBody}
            action={
              <LinkButton href={path('/mes-demandes/nouvelle')} size="sm" className="mt-2">
                {t.dashboard.postRequest}
              </LinkButton>
            }
          />
        )}
      </section>

      <section className="mt-10">
        <SectionTitle
          title={t.dashboard.latestNotifications}
          action={
            <LinkButton href={path('/notifications')} variant="ghost" size="sm">
              {t.common.seeAll}
            </LinkButton>
          }
        />
        {notifications.data && notifications.data.length > 0 ? (
          <Card className="p-0">
            <ul className="divide-y divide-sable-200">
              {notifications.data.map((notification) => (
                <li key={notification.id}>
                  <Link
                    href={path(notification.url ?? '/notifications')}
                    className="flex items-start gap-3 px-5 py-3.5 hover:bg-sable-100"
                  >
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        notification.read_at ? 'bg-sable-300' : 'bg-argile-500'
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-encre-900">
                        {notification.title}
                      </span>
                      {notification.body ? (
                        <span className="mt-0.5 block text-sm text-encre-500">
                          {notification.body}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs text-encre-400">
                      {f.relative(notification.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card className="text-sm text-encre-500">{t.dashboard.noNotification}</Card>
        )}
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {shortcuts.map((shortcut) => (
          <Link
            key={shortcut.href}
            href={path(shortcut.href)}
            className="surface flex items-center gap-3 p-5 transition-shadow hover:shadow-md"
          >
            <span className="text-2xl" aria-hidden>
              {shortcut.icon}
            </span>
            <span className="font-semibold text-encre-900">{shortcut.title}</span>
            <span className="ms-auto text-encre-400">→</span>
          </Link>
        ))}
      </section>
    </div>
  )
}
