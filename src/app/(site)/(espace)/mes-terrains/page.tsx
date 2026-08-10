import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge, Card, EmptyState, LinkButton, SectionTitle } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { formatDate, formatDh, formatSurface } from '@/lib/format'
import { LISTING_STATUS_LABELS, ZONING_LABELS } from '@/lib/labels'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ListingStatus, LandZoning } from '@/lib/types'

export const metadata: Metadata = { title: 'Mes terrains proposés' }

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

export default async function MesTerrainsPage() {
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
        title="Mes terrains proposés"
        subtitle={`${lands.length} annonce${lands.length > 1 ? 's' : ''}`}
        action={<LinkButton href="/mes-terrains/nouveau">Proposer un terrain</LinkButton>}
      />

      {lands.length === 0 ? (
        <EmptyState
          icon="🏞️"
          title="Aucun terrain proposé"
          description="Décrivez votre terrain en six étapes. Une fois validé, il sera confronté automatiquement aux demandes des participants."
          action={
            <LinkButton href="/mes-terrains/nouveau" size="sm" className="mt-2">
              Proposer mon premier terrain
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
                    {LISTING_STATUS_LABELS[land.status]}
                  </Badge>
                  <Badge tone="argile">{ZONING_LABELS[land.zoning]}</Badge>
                  {land.reference ? <Badge>Réf. {land.reference}</Badge> : null}
                </div>
                <h3 className="mt-2 font-semibold text-encre-900">{land.title}</h3>
                <p className="mt-1 text-sm text-encre-500">
                  {formatSurface(land.surface_m2)} · {formatDh(land.total_price)} · déposé le{' '}
                  {formatDate(land.created_at)}
                  {land.status === 'publie'
                    ? ` · ${land.view_count} consultation${land.view_count > 1 ? 's' : ''}`
                    : ''}
                </p>
                {land.status === 'refuse' && land.rejection_reason ? (
                  <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                    Motif du refus : {land.rejection_reason}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 gap-2">
                <LinkButton href={`/mes-terrains/${land.id}`} variant="secondary" size="sm">
                  Gérer
                </LinkButton>
                {land.status === 'publie' ? (
                  <LinkButton href={`/terrains/${land.id}`} variant="ghost" size="sm">
                    Voir la fiche
                  </LinkButton>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-8 text-sm text-encre-400">
        Besoin d’aide pour constituer votre dossier ?{' '}
        <Link href="/faq" className="font-semibold text-argile-600">
          Consultez la FAQ
        </Link>
        .
      </p>
    </div>
  )
}
