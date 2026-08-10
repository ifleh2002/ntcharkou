import type { Metadata } from 'next'
import Link from 'next/link'
import { markAllNotificationsRead } from '@/app/actions/interactions'
import { Button, Card, EmptyState, LinkButton, SectionTitle } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { NOTIFICATION_ICONS } from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { AppNotification } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: getDictionary(resolveLocale(locale)).notifications.title }
}

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const { t, f, path } = translation(locale)

  const session = await requireSession('/notifications')
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(100)
    .returns<AppNotification[]>()

  const notifications = data ?? []
  const unread = notifications.filter((n) => !n.read_at).length

  return (
    <div>
      <SectionTitle
        title={t.notifications.title}
        subtitle={
          unread > 0 ? `${unread} ${t.notifications.unread}` : t.notifications.allRead
        }
        action={
          unread > 0 ? (
            <form action={markAllNotificationsRead}>
              <Button type="submit" variant="secondary" size="sm">
                {t.notifications.markAllRead}
              </Button>
            </form>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title={t.notifications.emptyTitle}
          description={t.notifications.emptyBody}
          action={
            <LinkButton href={path('/mes-demandes/nouvelle')} size="sm" className="mt-2">
              {t.requests.newRequest}
            </LinkButton>
          }
        />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-sable-200">
            {notifications.map((notification) => (
              <li key={notification.id} className={notification.read_at ? '' : 'bg-argile-50/60'}>
                <Link
                  href={path(notification.url ?? '/notifications')}
                  className="flex items-start gap-3 px-5 py-4 hover:bg-sable-100"
                >
                  <span className="text-xl" aria-hidden>
                    {NOTIFICATION_ICONS[notification.kind] ?? '🔔'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-encre-900">{notification.title}</span>
                    {notification.body ? (
                      <span className="mt-0.5 block text-sm text-encre-500">
                        {notification.body}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-encre-400">
                      {f.relative(notification.created_at)}
                    </span>
                    {!notification.read_at ? (
                      <span
                        className="size-2 rounded-full bg-argile-500"
                        aria-label={t.notifications.unreadMark}
                      />
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
