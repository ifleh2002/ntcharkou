'use client'

import 'leaflet/dist/leaflet.css'
import type { Map as LeafletMap, Polygon as LeafletPolygon } from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import type { Dictionary } from '@/lib/i18n'
import {
  MARKET_STATUS_ORDER,
  MOROCCO_CENTER,
  MOROCCO_ZOOM,
  type GeoPolygon,
  marketColor,
  polygonToVertices,
} from '@/lib/map'

export interface MapLand {
  id: string
  title: string
  reference: string | null
  market_status: string
  zoning: string
  zonings: string[] | null
  surface_m2: number
  parcel_area_m2: number | null
  price_per_m2: number | null
  total_price: number | null
  has_water: boolean
  has_electricity: boolean
  has_sewage: boolean
  parcel: GeoPolygon | null
  map_lat: number | null
  map_lng: number | null
}

/**
 * Carte des terrains.
 *
 * Leaflet est chargé dans un effet, jamais au rendu serveur : il touche
 * `window` dès l'import et ferait échouer le rendu de la page.
 *
 * Fond OpenStreetMap : aucune clé d'API, donc rien à provisionner ni à
 * facturer. Le tracé est stocké en GeoJSON standard, si bien qu'un passage
 * ultérieur à Mapbox ou Google ne toucherait que ce composant.
 */
export function LandMap({
  lands,
  t,
  locale,
  height = 520,
  onSelect,
}: {
  lands: MapLand[]
  t: Dictionary
  locale: string
  height?: number
  onSelect?: (id: string) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<LeafletMap | null>(null)
  const shapes = useRef<LeafletPolygon[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      const L = await import('leaflet')
      if (cancelled || !container.current || map.current) return

      map.current = L.map(container.current, {
        center: MOROCCO_CENTER,
        zoom: MOROCCO_ZOOM,
        scrollWheelZoom: false, // sinon la page ne défile plus au survol
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map.current)

      setReady(true)
    }

    void boot()
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Redessine à chaque changement de jeu de terrains — un filtre, un
  // déplacement de carte.
  useEffect(() => {
    if (!ready || !map.current) return
    let cancelled = false

    async function draw() {
      const L = await import('leaflet')
      if (cancelled || !map.current) return

      shapes.current.forEach((shape) => shape.remove())
      shapes.current = []

      const bounds = L.latLngBounds([])

      for (const land of lands) {
        const color = marketColor(land.market_status)
        const vertices = polygonToVertices(land.parcel)

        // Sans contour tracé, un cercle au centre connu : le terrain reste
        // repérable plutôt que d'être absent de la carte.
        const shape = vertices.length
          ? L.polygon(vertices, { color, weight: 2, fillColor: color, fillOpacity: 0.35 })
          : land.map_lat != null && land.map_lng != null
            ? (L.circle([land.map_lat, land.map_lng], {
                radius: 60,
                color,
                fillColor: color,
                fillOpacity: 0.35,
              }) as unknown as LeafletPolygon)
            : null

        if (!shape) continue

        shape.addTo(map.current)
        shape.bindPopup(popupHtml(land, t, locale))
        if (onSelect) shape.on('click', () => onSelect(land.id))
        shapes.current.push(shape)
        bounds.extend(shape.getBounds())
      }

      if (bounds.isValid()) map.current.fitBounds(bounds.pad(0.2), { maxZoom: 16 })
    }

    void draw()
    return () => {
      cancelled = true
    }
  }, [ready, lands, t, locale, onSelect])

  return (
    <div>
      <div
        ref={container}
        style={{ height }}
        className="w-full overflow-hidden rounded-xl border border-sable-300 bg-sable-200"
        role="application"
        aria-label={t.map.title}
      />
      <MapLegend t={t} />
    </div>
  )
}

/** Sans légende, les couleurs ne veulent rien dire pour un premier visiteur. */
export function MapLegend({ t }: { t: Dictionary }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
      {MARKET_STATUS_ORDER.map((status) => (
        <li key={status} className="flex items-center gap-1.5 text-xs text-encre-500">
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-sm border border-black/10"
            style={{ backgroundColor: marketColor(status) }}
          />
          {t.enums.marketStatus[status]}
        </li>
      ))}
    </ul>
  )
}

/**
 * Contenu de la bulle. Leaflet attend du HTML : les valeurs venant de la base
 * sont donc échappées, sans quoi un titre contenant « <script> » s'exécuterait.
 */
function popupHtml(land: MapLand, t: Dictionary, locale: string): string {
  const esc = (value: unknown) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
    )

  const nf = new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : 'fr-MA')
  const surface = land.parcel_area_m2 ?? land.surface_m2
  const zonings = (land.zonings?.length ? land.zonings : [land.zoning])
    .map((z) => esc(t.enums.zoning[z as keyof typeof t.enums.zoning] ?? z))
    .join(', ')

  const reseau = (ok: boolean, label: string) =>
    `<div>${esc(label)} ${ok ? '✓' : '—'}</div>`

  return `
    <div style="min-width:180px">
      <strong>${esc(land.title)}</strong>
      ${land.reference ? `<div style="opacity:.6;font-size:11px">${esc(land.reference)}</div>` : ''}
      <div style="margin-top:6px">📐 ${esc(nf.format(Math.round(surface)))} m²</div>
      ${
        land.price_per_m2
          ? `<div>💰 ${esc(nf.format(land.price_per_m2))} ${esc(t.common.perM2)}</div>`
          : ''
      }
      <div>🏗️ ${zonings}</div>
      <div style="margin-top:6px;font-size:12px">
        ${reseau(land.has_water, t.enums.network.water)}
        ${reseau(land.has_sewage, t.enums.network.sewage)}
        ${reseau(land.has_electricity, t.enums.network.electricity)}
      </div>
      <a href="/${esc(locale)}/terrains/${esc(land.id)}"
         style="display:inline-block;margin-top:8px;font-weight:600;color:#a74c2c">
        ${esc(t.map.openLand)}
      </a>
    </div>`
}
