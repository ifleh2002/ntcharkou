import type { Metadata } from 'next'
import { setUserSuspended } from '@/app/actions/admin'
import { Badge, Button, Card } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: `${getDictionary(resolveLocale(locale)).admin.usersTitle} — Ntcharkou` }
}

interface Row {
  id: string
  role: UserRole
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  region_code: string | null
  is_suspended: boolean
  created_at: string
  lands_count: number
  requests_count: number
}

export default async function AdminUtilisateursPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale: raw } = await params
  const { t, f } = translation(resolveLocale(raw))

  const session = await requireAdmin()
  const query = await searchParams
  const search = typeof query.q === 'string' ? query.q : ''
  const role = typeof query.role === 'string' ? query.role : ''

  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.rpc('admin_list_users', {
    p_search: search || null,
    p_role: role || null,
    p_limit: 100,
    p_offset: 0,
  })

  const users = (data ?? []) as Row[]

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-encre-900">{t.admin.usersTitle}</h1>
        <p className="mt-1 text-sm text-encre-500">
          {users.length} {t.admin.usersShown}
        </p>
      </header>

      <form method="get" className="surface mb-6 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-64 flex-1">
          <label className="etiquette" htmlFor="q">
            {t.common.search}
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            className="champ"
            placeholder={t.admin.searchPlaceholder}
          />
        </div>
        <div className="min-w-44">
          <label className="etiquette" htmlFor="role">
            {t.admin.colRole}
          </label>
          <select id="role" name="role" className="champ" defaultValue={role}>
            <option value="">{t.common.all}</option>
            {(Object.keys(t.enums.role) as UserRole[]).map((key) => (
              <option key={key} value={key}>
                {t.enums.role[key]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">{t.common.filter}</Button>
      </form>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-sable-300 bg-sable-100 text-start">
            <tr>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colName}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colRole}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colEmail}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colPhone}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colLands}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colRequests}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colRegisteredOn}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colStatus}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sable-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-sable-50">
                <td className="px-4 py-3 font-medium text-encre-900">
                  {`${user.first_name} ${user.last_name}`.trim() || '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={user.role === 'admin' ? 'argile' : 'neutre'}>
                    {t.enums.role[user.role]}
                  </Badge>
                </td>
                <td className="ltr-inline px-4 py-3 text-encre-700">{user.email ?? '—'}</td>
                <td className="ltr-inline px-4 py-3 text-encre-700">{user.phone ?? '—'}</td>
                <td className="px-4 py-3 text-encre-700">{user.lands_count}</td>
                <td className="px-4 py-3 text-encre-700">{user.requests_count}</td>
                <td className="px-4 py-3 text-encre-500">{f.date(user.created_at)}</td>
                <td className="px-4 py-3">
                  {user.id === session.userId ? (
                    <span className="text-xs text-encre-400">{t.admin.you}</span>
                  ) : (
                    <form action={setUserSuspended}>
                      <input type="hidden" name="profile_id" value={user.id} />
                      <input type="hidden" name="suspended" value={user.is_suspended ? '0' : '1'} />
                      <Button
                        type="submit"
                        variant={user.is_suspended ? 'secondary' : 'ghost'}
                        size="sm"
                      >
                        {user.is_suspended ? t.admin.restore : t.admin.suspend}
                      </Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-encre-400">
                  {t.admin.noUsers}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
