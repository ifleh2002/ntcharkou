import type { Metadata } from 'next'
import Link from 'next/link'
import { reviewLand } from '@/app/actions/admin'
import { Badge, Button, Card } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { LandZoning, ListingStatus } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: `${getDictionary(resolveLocale(locale)).admin.landsTitle} — Ntcharkou` }
}

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
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const { t, f, path } = translation(locale)

  await requireAdmin()
  const urlParams = await searchParams
  const status = typeof urlParams.statut === 'string' ? urlParams.statut : ''
  const region = typeof urlParams.region === 'string' ? urlParams.region : ''

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
    supabase.from('regions').select('code, name_fr, name_ar').order('sort_order'),
  ])

  const lands = data ?? []

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-encre-900">{t.admin.landsTitle}</h1>
        <p className="mt-1 text-sm text-encre-500">
          {lands.length} {t.admin.landsShown}
        </p>
      </header>

      <form method="get" className="surface mb-6 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-44">
          <label className="etiquette" htmlFor="statut">
            {t.admin.status}
          </label>
          <select id="statut" name="statut" className="champ" defaultValue={status}>
            <option value="">{t.common.all}</option>
            {(Object.keys(t.enums.listingStatus) as ListingStatus[]).map((key) => (
              <option key={key} value={key}>
                {t.enums.listingStatus[key]}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-52">
          <label className="etiquette" htmlFor="region">
            {t.common.region}
          </label>
          <select id="region" name="region" className="champ" defaultValue={region}>
            <option value="">{t.common.allRegions}</option>
            {(regions ?? []).map((r: { code: string; name_fr: string; name_ar: string | null }) => (
              <option key={r.code} value={r.code}>
                {locale === 'ar' ? (r.name_ar ?? r.name_fr) : r.name_fr}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="md">
          {t.common.filter}
        </Button>
      </form>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="border-b border-sable-300 bg-sable-100 text-start">
            <tr>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colReference}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colTitle}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colZoning}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colSurface}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colTotalPrice}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colStatus}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colPostedOn}</th>
              <th className="px-4 py-3 font-semibold text-encre-700">{t.admin.colActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sable-200">
            {lands.map((land) => (
              <tr key={land.id} className="hover:bg-sable-50">
                <td className="ltr-inline px-4 py-3 font-mono text-xs text-encre-500">
                  {land.reference ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={path(`/terrains/${land.id}`)}
                    className="font-medium text-encre-900 hover:text-argile-600"
                  >
                    {land.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-encre-700">{t.enums.zoning[land.zoning]}</td>
                <td className="px-4 py-3 text-encre-700">{f.surface(land.surface_m2)}</td>
                <td className="px-4 py-3 text-encre-700">{f.dh(land.total_price)}</td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONES[land.status]}>{t.enums.listingStatus[land.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-encre-500">{f.date(land.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {land.status !== 'publie' ? (
                      <form action={reviewLand}>
                        <input type="hidden" name="land_id" value={land.id} />
                        <input type="hidden" name="status" value="publie" />
                        <Button type="submit" size="sm">
                          {t.admin.publish}
                        </Button>
                      </form>
                    ) : (
                      <form action={reviewLand}>
                        <input type="hidden" name="land_id" value={land.id} />
                        <input type="hidden" name="status" value="archive" />
                        <Button type="submit" variant="secondary" size="sm">
                          {t.admin.archive}
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
                  {t.admin.noLandMatch}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
