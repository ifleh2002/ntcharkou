import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { expressInterest, toggleFavorite } from '@/app/actions/interactions'
import { Gallery } from '@/components/gallery'
import { Alert, Badge, Button, Card, LinkButton } from '@/components/ui'
import { getSessionContext } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { getLand, getLandImages } from '@/lib/queries'
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}): Promise<Metadata> {
  const { locale, id } = await params
  const t = getDictionary(resolveLocale(locale))
  const land = await getLand(id, resolveLocale(locale))
  if (!land) return { title: t.lands.notFound }
  return {
    title: `${land.title} — ${land.city_name ?? land.region_name}`,
    description: land.description?.slice(0, 160) ?? land.title,
  }
}

const NETWORKS = [
  { key: 'has_water', label: 'water', icon: '💧' },
  { key: 'has_electricity', label: 'electricity', icon: '⚡' },
  { key: 'has_sewage', label: 'sewage', icon: '🚰' },
  { key: 'has_telecom', label: 'telecom', icon: '📶' },
  { key: 'has_gas', label: 'gas', icon: '🔥' },
] as const

export default async function TerrainDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale: raw, id } = await params
  const locale = resolveLocale(raw)
  const { t, f, path } = translation(locale)
  const query = await searchParams

  const land = await getLand(id, locale)
  if (!land) notFound()

  const [images, session] = await Promise.all([getLandImages(id), getSessionContext()])

  // Compteur de vues (fonction SECURITY DEFINER, sans effet si non publie).
  if (isSupabaseConfigured() && land.status === 'publie') {
    const supabase = await createSupabaseServerClient()
    await supabase.rpc('increment_land_views', { p_land: id })
  }

  let isFavorite = false
  if (session) {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('profile_id', session.userId)
      .eq('land_id', id)
      .maybeSingle()
    isFavorite = Boolean(data)
  }

  const location = [land.district, land.city_name, land.region_name].filter(Boolean).join(' — ')

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-5 text-sm text-encre-400">
        <Link href={path('/terrains')} className="hover:text-argile-600">
          {t.nav.lands}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-encre-700">{land.title}</span>
      </nav>

      {land.status !== 'publie' ? (
        <div className="mb-5">
          <Alert tone="info" title={t.lands.detailPrivateTitle}>
            {t.lands.detailPrivateBody}
          </Alert>
        </div>
      ) : null}

      {query.interet ? (
        <div className="mb-5">
          <Alert tone="succes" title={t.lands.interestSent}>
            {t.lands.interestSentBody}
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <Gallery
            images={images}
            title={land.title}
            seed={land.id}
            noPhotoLabel={t.lands.noPhoto}
          />

          <header className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="argile">{t.enums.zoning[land.zoning]}</Badge>
              {land.price_negotiable ? <Badge tone="safran">{t.lands.negotiablePrice}</Badge> : null}
              {land.reference ? (
                <Badge>
                  {t.common.reference} <span className="ltr-inline">{land.reference}</span>
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-3 text-3xl font-bold text-encre-900">{land.title}</h1>
            <p className="mt-2 text-encre-500">📍 {location}</p>
          </header>

          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: t.lands.surfaceLabel, value: f.surface(land.surface_m2) },
              {
                label: t.lands.pricePerM2,
                value: land.price_per_m2 ? `${f.dh(land.price_per_m2)}/${f.sqm}` : '—',
              },
              { label: t.lands.totalPrice, value: f.dh(land.total_price) },
              {
                label: t.lands.buildableUnits,
                value: land.estimated_units ? `≈ ${f.number(land.estimated_units)}` : '—',
              },
            ].map((item) => (
              <div key={item.label} className="surface p-4">
                <dt className="text-xs font-semibold tracking-wide text-encre-400 uppercase">
                  {item.label}
                </dt>
                <dd className="mt-1 font-bold text-encre-900">{item.value}</dd>
              </div>
            ))}
          </dl>

          <section className="mt-8">
            <h2 className="mb-3 text-xl font-bold text-encre-900">{t.lands.characteristics}</h2>
            <Card>
              <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {[
                  { label: t.lands.zoning, value: t.enums.zoning[land.zoning] },
                  { label: t.lands.surfaceLabel, value: f.surface(land.surface_m2) },
                  { label: t.lands.facade, value: land.facade_m ? `${land.facade_m} m` : '—' },
                  { label: t.lands.depth, value: land.depth_m ? `${land.depth_m} m` : '—' },
                  { label: t.lands.facadeCount, value: land.facade_count ?? '—' },
                  {
                    label: t.lands.roadWidth,
                    value: land.road_width_m ? `${land.road_width_m} m` : '—',
                  },
                  {
                    label: t.lands.legalStatus,
                    value: land.legal_status ? t.enums.legalStatus[land.legal_status] : '—',
                  },
                  { label: t.common.publishedOn, value: f.date(land.published_at) },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between gap-4 border-b border-sable-200 pb-2"
                  >
                    <dt className="text-sm text-encre-500">{row.label}</dt>
                    <dd className="text-sm font-medium text-encre-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
              {land.observations ? (
                <p className="mt-4 text-sm text-encre-500">
                  <span className="font-semibold text-encre-700">{t.lands.observations} :</span>{' '}
                  {land.observations}
                </p>
              ) : null}
            </Card>
          </section>

          <section className="mt-8">
            <h2 className="mb-3 text-xl font-bold text-encre-900">{t.lands.networks}</h2>
            <Card>
              <ul className="grid gap-2 sm:grid-cols-2">
                {NETWORKS.map((network) => {
                  const available = land[network.key]
                  return (
                    <li key={network.key} className="flex items-center gap-2 text-sm">
                      <span aria-hidden>{available ? '✅' : '⬜'}</span>
                      <span className={available ? 'text-encre-900' : 'text-encre-400'}>
                        {network.icon} {t.enums.network[network.label]}
                      </span>
                    </li>
                  )
                })}
              </ul>
              {land.network_other ? (
                <p className="mt-3 text-sm text-encre-500">
                  {t.lands.otherNetwork} : {land.network_other}
                </p>
              ) : null}
            </Card>
          </section>

          {land.description ? (
            <section className="mt-8">
              <h2 className="mb-3 text-xl font-bold text-encre-900">{t.lands.description}</h2>
              <Card>
                <p className="text-sm leading-relaxed whitespace-pre-line text-encre-700">
                  {land.description}
                </p>
              </Card>
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <p className="text-3xl font-bold text-argile-600">{f.dh(land.total_price)}</p>
            {land.price_per_m2 ? (
              <p className="mt-1 text-sm text-encre-500">
                {f.surface(land.surface_m2)} × {f.dh(land.price_per_m2)}
              </p>
            ) : null}

            <div className="mt-5 space-y-2">
              <form action={expressInterest}>
                <input type="hidden" name="land_id" value={land.id} />
                <input type="hidden" name="return_to" value={`/terrains/${land.id}`} />
                <Button type="submit" className="w-full" size="lg">
                  {t.lands.interested}
                </Button>
              </form>

              <form action={toggleFavorite}>
                <input type="hidden" name="land_id" value={land.id} />
                <input type="hidden" name="return_to" value={`/terrains/${land.id}`} />
                <Button type="submit" variant="secondary" className="w-full">
                  {isFavorite ? `❤️ ${t.lands.removeFavorite}` : `🤍 ${t.lands.addFavorite}`}
                </Button>
              </form>

              <LinkButton
                href={path(`/mes-demandes/nouvelle?terrain=${land.id}`)}
                variant="ghost"
                className="w-full"
              >
                🔔 {t.lands.similarAlert}
              </LinkButton>
            </div>

            <p className="mt-5 border-t border-sable-200 pt-4 text-xs leading-relaxed text-encre-400">
              {t.lands.privacyNote}
            </p>
          </Card>

          <Card className="mt-4">
            <p className="text-sm font-semibold text-encre-900">{t.lands.groupPrompt}</p>
            <p className="mt-1.5 text-sm text-encre-500">{t.lands.groupPromptBody}</p>
            <LinkButton
              href={path('/projets')}
              variant="collectif"
              size="sm"
              className="mt-3 w-full"
            >
              {t.lands.groupPromptCta}
            </LinkButton>
          </Card>

          <p className="mt-4 text-center text-xs text-encre-400">
            {f.number(land.view_count)} {t.lands.views} ·{' '}
            <Link href={path(`/contact?terrain=${land.id}`)} className="underline">
              {t.lands.report}
            </Link>
          </p>
        </aside>
      </div>
    </div>
  )
}
