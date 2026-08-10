import type { Metadata } from 'next'
import Link from 'next/link'
import { markAllNotificationsRead } from '@/app/actions/interactions'
import { Button, Card, EmptyState, LinkButton, SectionTitle } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { formatRelativeDate } from '@/lib/format'
import { NOTIFICATION_ICONS } from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { AppNotification } from '@/lib/types'

export const metadata: Metadata = { title: 'Mes notifications' }

export default async function NotificationsPage() {
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
        title="Mes notifications"
        subtitle={
          unread > 0
            ? `${unread} notification${unread > 1 ? 's' : ''} non lue${unread > 1 ? 's' : ''}`
            : 'Tout est à jour.'
        }
        action={
          unread > 0 ? (
            <form action={markAllNotificationsRead}>
              <Button type="submit" variant="secondary" size="sm">
                Tout marquer comme lu
              </Button>
            </form>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="Aucune notification"
          description="Vous serez prévenu dès qu’un terrain correspondra à l’une de vos demandes, ou qu’une décision sera prise sur l’un de vos dossiers."
          action={
            <LinkButton href="/mes-demandes/nouvelle" size="sm" className="mt-2">
              Déposer une demande
            </LinkButton>
          }
        />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-sable-200">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={notification.read_at ? '' : 'bg-argile-50/60'}
              >
                <Link
                  href={notification.url ?? '/notifications'}
                  className="flex items-start gap-3 px-5 py-4 hover:bg-sable-100"
                >
                  <span className="text-xl" aria-hidden>
                    {NOTIFICATION_ICONS[notification.kind] ?? '🔔'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-encre-900">{notification.title}</span>
                    {notification.body ? (
                      <span className="mt-0.5 block text-sm text-encre-500">{notification.body}</span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-encre-400">
                      {formatRelativeDate(notification.created_at)}
                    </span>
                    {!notification.read_at ? (
                      <span className="size-2 rounded-full bg-argile-500" aria-label="Non lue" />
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
