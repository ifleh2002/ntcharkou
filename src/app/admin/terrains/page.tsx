import type { Metadata } from 'next'
import Link from 'next/link'
import { reviewLand } from '@/app/actions/admin'
import { Badge, Button, Card } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { formatDate, formatDh, formatSurface } from '@/lib/format'
import { LISTING_STATUS_LABELS, ZONING_LABELS } from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { LandZoning, ListingStatus } from '@/lib/types'

export const metadata: Metadata = { title: 'Terrains — Administration' }

const STATUS_TONES: Record<ListingStatus, 'neutre' | 'alerte' | 'succes' | 'danger' | 'argile'> = {
  brouillon: 'neutre',
  soumis: 'alerte',
  en_verification: 'alerte',
  valide: 'argile',
  publie: 'succes',
  refuse: 'danger',
  archive: 'neutre',
}

interface Row {
  id: string
  reference: string | null
  title: string
  status: ListingStatus
  zoning: LandZoning
  surface_m2: number
  price_per_m2: number | null
  total_price: number | null
  created_at: string
  view_count: number
  region_code: string
}

export default async function AdminTerrainsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdmin()
  const params = await searchParams
  const status = typeof params.statut === 'string' ? params.statut : ''
  const region = typeof params.region === 'string' ? params.region : ''

  const supabase = await createSupabaseServerClient()

  let query = supabase
    .from('land_listings')
    .select(
      'id, reference, title, status, zoning, surface_m2, price_per_m2, total_price, created_at, view_count, region_code',
    )
    .order('created_at', { ascending: false })
    .limit(200)
  if (status) query = query.eq('status', status)
  if (region) query = query.eq('region_code', region)

  const [{ data }, { data: regions }] = await Promise.all([
    query.returns<Row[]>(),
    supabase.from('regions').select('code, name_fr').order('sort_order'),
  ])

  const lands = data ?? []

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-encre-900">Terrains</h1>
        <p className="mt-1 text-sm text-encre-500">{lands.length} annonces affichées</p>
      </header>

      <form method="get" className="surface mb-6 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-44">
          <label className="etiquette" htmlFor="statut">
            Statut
          </label>
          <select id="statut" name="statut" className="champ" defaultValue={status}>
            <option value="">Tous</option>
            {(Object.keys(LISTING_STATUS_LABELS) as ListingStatus[]).map((key) => (
              <option key={key} value={key}>
                {LISTING_STATUS_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-52">
          <label className="etiquette" htmlFor="region">
            Région
          </label>
          <select id="region" name="region" className="champ" defaultValue={region}>
            <option value="">Toutes</option>
            {(regions ?? []).map((r: { code: string; name_fr: string }) => (
              <option key={r.code} value={r.code}>
                {r.name_fr}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="md">
          Filtrer
        </Button>
      </form>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="border-b border-sable-300 bg-sable-100 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-encre-700">Référence</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Titre</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Zonage</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Surface</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Prix total</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Statut</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Déposé le</th>
              <th className="px-4 py-3 font-semibold text-encre-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sable-200">
            {lands.map((land) => (
              <tr key={land.id} className="hover:bg-sable-50">
                <td className="px-4 py-3 font-mono text-xs text-encre-500">
                  {land.reference ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/terrains/${land.id}`} className="font-medium text-encre-900 hover:text-argile-600">
                    {land.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-encre-700">{ZONING_LABELS[land.zoning]}</td>
                <td className="px-4 py-3 text-encre-700">{formatSurface(land.surface_m2)}</td>
                <td className="px-4 py-3 text-encre-700">{formatDh(land.total_price)}</td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONES[land.status]}>{LISTING_STATUS_LABELS[land.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-encre-500">{formatDate(land.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {land.status !== 'publie' ? (
                      <form action={reviewLand}>
                        <input type="hidden" name="land_id" value={land.id} />
                        <input type="hidden" name="status" value="publie" />
                        <Button type="submit" size="sm">
                          Publier
                        </Button>
                      </form>
                    ) : (
                      <form action={reviewLand}>
                        <input type="hidden" name="land_id" value={land.id} />
                        <input type="hidden" name="status" value="archive" />
                        <Button type="submit" variant="secondary" size="sm">
                          Archiver
                        </Button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {lands.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-encre-400">
                  Aucun terrain ne correspond à ces filtres.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
