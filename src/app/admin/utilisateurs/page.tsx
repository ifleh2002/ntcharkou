import type { Metadata } from 'next'
import { setUserSuspended } from '@/app/actions/admin'
import { Badge, Button, Card } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'

export const metadata: Metadata = { title: 'Utilisateurs — Administration' }

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
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireAdmin()
  const params = await searchParams
  const search = typeof params.q === 'string' ? params.q : ''
  const role = typeof params.role === 'string' ? params.role : ''

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
        <h1 className="text-2xl font-bold text-encre-900">Utilisateurs</h1>
        <p className="mt-1 text-sm text-encre-500">
          {users.length} comptes affichés. Les coordonnées ne sont visibles que dans ce back-office.
        </p>
      </header>

      <form method="get" className="surface mb-6 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-64 flex-1">
          <label className="etiquette" htmlFor="q">
            Recherche
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            className="champ"
            placeholder="Nom, email, téléphone…"
          />
        </div>
        <div className="min-w-44">
          <label className="etiquette" htmlFor="role">
            Rôle
          </label>
          <select id="role" name="role" className="champ" defaultValue={role}>
            <option value="">Tous</option>
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((key) => (
              <option key={key} value={key}>
                {ROLE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Filtrer</Button>
      </form>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-sable-300 bg-sable-100 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-encre-700">Nom</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Rôle</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Email</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Téléphone</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Terrains</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Demandes</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Inscrit le</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Statut</th>
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
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-encre-700">{user.email ?? '—'}</td>
                <td className="px-4 py-3 text-encre-700">{user.phone ?? '—'}</td>
                <td className="px-4 py-3 text-encre-700">{user.lands_count}</td>
                <td className="px-4 py-3 text-encre-700">{user.requests_count}</td>
                <td className="px-4 py-3 text-encre-500">{formatDate(user.created_at)}</td>
                <td className="px-4 py-3">
                  {user.id === session.userId ? (
                    <span className="text-xs text-encre-400">Vous</span>
                  ) : (
                    <form action={setUserSuspended}>
                      <input type="hidden" name="profile_id" value={user.id} />
                      <input type="hidden" name="suspended" value={user.is_suspended ? '0' : '1'} />
                      <Button
                        type="submit"
                        variant={user.is_suspended ? 'secondary' : 'ghost'}
                        size="sm"
                      >
                        {user.is_suspended ? 'Rétablir' : 'Suspendre'}
                      </Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-encre-400">
                  Aucun utilisateur ne correspond à ces critères.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
