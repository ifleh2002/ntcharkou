import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge, Card, EmptyState, LinkButton, SectionTitle } from '@/components/ui'
import { requireSession } from '@/lib/auth'
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
  return { title: getDictionary(resolveLocale(locale)).myLands.title }
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
  total_price: number | null
  created_at: string
  published_at: string | null
  view_count: number
  rejection_reason: string | null
}

export default async function MesTerrainsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const { t, f, path } = translation(locale)

  const session = await requireSession('/mes-terrains')
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('land_listings')
    .select(
      'id, reference, title, status, zoning, surface_m2, total_price, created_at, published_at, view_count, rejection_reason',
    )
    .eq('owner_id', session.userId)
    .order('created_at', { ascending: false })
    .returns<Row[]>()

  const lands = data ?? []

  return (
    <div>
      <SectionTitle
        title={t.myLands.title}
        subtitle={`${lands.length} ${t.myLands.listings}`}
        action={<LinkButton href={path('/mes-terrains/nouveau')}>{t.myLands.propose}</LinkButton>}
      />

      {lands.length === 0 ? (
        <EmptyState
          icon="🏞️"
          title={t.myLands.emptyTitle}
          description={t.myLands.emptyBody}
          action={
            <LinkButton href={path('/mes-terrains/nouveau')} size="sm" className="mt-2">
              {t.myLands.emptyCta}
            </LinkButton>
          }
        />
      ) : (
        <div className="space-y-3">
          {lands.map((land) => (
            <Card key={land.id} className="flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={STATUS_TONES[land.status]}>
                    {t.enums.listingStatus[land.status]}
                  </Badge>
                  <Badge tone="argile">{t.enums.zoning[land.zoning]}</Badge>
                  {land.reference ? (
                    <Badge>
                      {t.common.reference} <span className="ltr-inline">{land.reference}</span>
                    </Badge>
                  ) : null}
                </div>
                <h3 className="mt-2 font-semibold text-encre-900">{land.title}</h3>
                <p className="mt-1 text-sm text-encre-500">
                  {f.surface(land.surface_m2)} · {f.dh(land.total_price)} · {t.common.createdOn}{' '}
                  {f.date(land.created_at)}
                  {land.status === 'publie'
                    ? ` · ${land.view_count} ${t.lands.views}`
                    : ''}
                </p>
                {land.status === 'refuse' && land.rejection_reason ? (
                  <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                    {t.myLands.rejectionReason} : {land.rejection_reason}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 gap-2">
                <LinkButton href={path(`/mes-terrains/${land.id}`)} variant="secondary" size="sm">
                  {t.common.manage}
                </LinkButton>
                {land.status === 'publie' ? (
                  <LinkButton href={path(`/terrains/${land.id}`)} variant="ghost" size="sm">
                    {t.myLands.seeListing}
                  </LinkButton>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-8 text-sm text-encre-400">
        {t.myLands.helpPrompt}{' '}
        <Link href={path('/faq')} className="font-semibold text-argile-600">
          {t.myLands.helpCta}
        </Link>
        .
      </p>
    </div>
  )
}
