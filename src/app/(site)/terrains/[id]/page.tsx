import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { expressInterest, toggleFavorite } from '@/app/actions/interactions'
import { Alert, Badge, Button, Card, LinkButton } from '@/components/ui'
import { getSessionContext } from '@/lib/auth'
import { formatDate, formatDh, formatNumber, formatSurface } from '@/lib/format'
import { LEGAL_STATUS_LABELS, ZONING_LABELS } from '@/lib/labels'
import { getLand, getLandImages } from '@/lib/queries'
import { landImageUrl } from '@/lib/storage'
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const land = await getLand(id)
  if (!land) return { title: 'Terrain introuvable' }
  return {
    title: `${land.title} — ${land.city_name ?? land.region_name}`,
    description:
      land.description?.slice(0, 160) ??
      `Terrain de ${land.surface_m2} m² à ${land.city_name ?? land.region_name}.`,
  }
}

const NETWORKS = [
  { key: 'has_water', label: 'Eau potable', icon: '💧' },
  { key: 'has_electricity', label: 'Électricité', icon: '⚡' },
  { key: 'has_sewage', label: 'Assainissement / eaux usées', icon: '🚰' },
  { key: 'has_telecom', label: 'Téléphone / Internet', icon: '📶' },
  { key: 'has_gas', label: 'Gaz', icon: '🔥' },
] as const

export default async function TerrainDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const query = await searchParams
  const land = await getLand(id)
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
  const isOwnerView = land.status !== 'publie'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-5 text-sm text-encre-400">
        <Link href="/terrains" className="hover:text-argile-600">
          Terrains
        </Link>
        <span className="mx-2">/</span>
        <span className="text-encre-700">{land.title}</span>
      </nav>

      {isOwnerView ? (
        <div className="mb-5">
          <Alert tone="info" title="Aperçu privé">
            Ce terrain n’est pas encore publié. Seuls vous et l’administration voyez cette page.
          </Alert>
        </div>
      ) : null}

      {query.interet ? (
        <div className="mb-5">
          <Alert tone="succes" title="Votre intérêt a été transmis">
            Le propriétaire a été notifié. Vos coordonnées ne lui ont pas été communiquées :
            l’administration prendra contact avec vous pour la suite.
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          {/* --- Galerie ------------------------------------------------- */}
          <div className="surface overflow-hidden p-0">
            <div className="aspect-16/9 bg-sable-200">
              {images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={landImageUrl(images[0].storage_path) ?? ''}
                  alt={land.title}
                  className="size-full object-cover"
                />
              ) : (
                <div className="motif-zellige grid size-full place-items-center text-6xl">🏞️</div>
              )}
            </div>
            {images.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto p-3">
                {images.slice(1, 7).map((image) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={image.id}
                    src={landImageUrl(image.storage_path) ?? ''}
                    alt={image.caption ?? land.title}
                    className="size-20 shrink-0 rounded-lg object-cover"
                  />
                ))}
              </div>
            ) : null}
          </div>

          {/* --- Titre et chiffres cles ---------------------------------- */}
          <header className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="argile">{ZONING_LABELS[land.zoning]}</Badge>
              {land.price_negotiable ? <Badge tone="safran">Prix négociable</Badge> : null}
              {land.reference ? <Badge>Réf. {land.reference}</Badge> : null}
            </div>
            <h1 className="mt-3 text-3xl font-bold text-encre-900">{land.title}</h1>
            <p className="mt-2 text-encre-500">📍 {location}</p>
          </header>

          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Superficie', value: formatSurface(land.surface_m2) },
              {
                label: 'Prix au m²',
                value: land.price_per_m2 ? `${formatDh(land.price_per_m2)}/m²` : '—',
              },
              { label: 'Prix total', value: formatDh(land.total_price) },
              {
                label: 'Logements réalisables',
                value: land.estimated_units ? `≈ ${formatNumber(land.estimated_units)}` : '—',
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

          {/* --- Caracteristiques ---------------------------------------- */}
          <section className="mt-8">
            <h2 className="mb-3 text-xl font-bold text-encre-900">Caractéristiques</h2>
            <Card>
              <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {[
                  { label: 'Type / zonage', value: ZONING_LABELS[land.zoning] },
                  { label: 'Superficie', value: formatSurface(land.surface_m2) },
                  { label: 'Façade', value: land.facade_m ? `${land.facade_m} m` : '—' },
                  { label: 'Profondeur', value: land.depth_m ? `${land.depth_m} m` : '—' },
                  { label: 'Nombre de façades', value: land.facade_count ?? '—' },
                  {
                    label: 'Largeur de voie',
                    value: land.road_width_m ? `${land.road_width_m} m` : '—',
                  },
                  {
                    label: 'Situation juridique',
                    value: land.legal_status ? LEGAL_STATUS_LABELS[land.legal_status] : '—',
                  },
                  { label: 'Publié le', value: formatDate(land.published_at) },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between gap-4 border-b border-sable-200 pb-2">
                    <dt className="text-sm text-encre-500">{row.label}</dt>
                    <dd className="text-sm font-medium text-encre-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
              {land.observations ? (
                <p className="mt-4 text-sm text-encre-500">
                  <span className="font-semibold text-encre-700">Observations :</span>{' '}
                  {land.observations}
                </p>
              ) : null}
            </Card>
          </section>

          {/* --- Reseaux -------------------------------------------------- */}
          <section className="mt-8">
            <h2 className="mb-3 text-xl font-bold text-encre-900">Réseaux</h2>
            <Card>
              <ul className="grid gap-2 sm:grid-cols-2">
                {NETWORKS.map((network) => {
                  const available = land[network.key]
                  return (
                    <li key={network.key} className="flex items-center gap-2 text-sm">
                      <span aria-hidden>{available ? '✅' : '⬜'}</span>
                      <span className={available ? 'text-encre-900' : 'text-encre-400'}>
                        {network.icon} {network.label}
                      </span>
                    </li>
                  )
                })}
              </ul>
              {land.network_other ? (
                <p className="mt-3 text-sm text-encre-500">Autre : {land.network_other}</p>
              ) : null}
            </Card>
          </section>

          {/* --- Description ---------------------------------------------- */}
          {land.description ? (
            <section className="mt-8">
              <h2 className="mb-3 text-xl font-bold text-encre-900">Description</h2>
              <Card>
                <p className="text-sm leading-relaxed whitespace-pre-line text-encre-700">
                  {land.description}
                </p>
              </Card>
            </section>
          ) : null}
        </div>

        {/* --- Colonne d'action ------------------------------------------- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <p className="text-3xl font-bold text-argile-600">{formatDh(land.total_price)}</p>
            {land.price_per_m2 ? (
              <p className="mt-1 text-sm text-encre-500">
                {formatSurface(land.surface_m2)} × {formatDh(land.price_per_m2)}
              </p>
            ) : null}

            <div className="mt-5 space-y-2">
              <form action={expressInterest}>
                <input type="hidden" name="land_id" value={land.id} />
                <input type="hidden" name="return_to" value={`/terrains/${land.id}`} />
                <Button type="submit" className="w-full" size="lg">
                  Je suis intéressé
                </Button>
              </form>

              <form action={toggleFavorite}>
                <input type="hidden" name="land_id" value={land.id} />
                <input type="hidden" name="return_to" value={`/terrains/${land.id}`} />
                <Button type="submit" variant="secondary" className="w-full">
                  {isFavorite ? '❤️ Retirer des favoris' : '🤍 Ajouter aux favoris'}
                </Button>
              </form>

              <LinkButton
                href={`/mes-demandes/nouvelle?terrain=${land.id}`}
                variant="ghost"
                className="w-full"
              >
                🔔 Recevoir une alerte similaire
              </LinkButton>
            </div>

            <p className="mt-5 border-t border-sable-200 pt-4 text-xs leading-relaxed text-encre-400">
              Les coordonnées du propriétaire ne sont pas publiées. Votre marque d’intérêt lui est
              transmise de façon anonyme ; l’administration organise la mise en relation.
            </p>
          </Card>

          <Card className="mt-4">
            <p className="text-sm font-semibold text-encre-900">Ce terrain vous intéresse à plusieurs ?</p>
            <p className="mt-1.5 text-sm text-encre-500">
              Créez un groupe et invitez d’autres participants à financer le projet avec vous.
            </p>
            <LinkButton
              href={`/mes-projets/nouveau?terrain=${land.id}`}
              variant="collectif"
              size="sm"
              className="mt-3 w-full"
            >
              Créer un groupe sur ce terrain
            </LinkButton>
          </Card>

          <p className="mt-4 text-center text-xs text-encre-400">
            {formatNumber(land.view_count)} consultation{land.view_count > 1 ? 's' : ''} ·{' '}
            <Link href={`/contact?terrain=${land.id}`} className="underline">
              Signaler cette annonce
            </Link>
          </p>
        </aside>
      </div>
    </div>
  )
}
