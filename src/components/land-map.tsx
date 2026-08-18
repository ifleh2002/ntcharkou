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
  clusterPoints,
  marketColor,
  polygonToVertices,
} from '@/lib/map'
import { LayerControl, MapCounters, useMapLayers } from './map-controls'

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

/** Zoom à partir duquel chaque terrain est dessiné pour lui-même. */
const DETAIL_ZOOM = 13

/**
 * Carte des terrains.
 *
 * À l'échelle du pays, les terrains sont regroupés en disques chiffrés : une
 * parcelle fait quelques dizaines de mètres, elle serait invisible. Les disques
 * se scindent à mesure qu'on approche, jusqu'au tracé réel de chaque parcelle.
 * Un clic sur un disque zoome dessus.
 *
 * Leaflet est chargé dans un effet, jamais au rendu serveur : il touche
 * `window` dès l'import et ferait échouer le rendu de la page.
 */
export function LandMap({
  lands,
  t,
  locale,
  height = 520,
  onSelect,
  openProjects = 0,
}: {
  lands: MapLand[]
  t: Dictionary
  locale: string
  height?: number
  onSelect?: (id: string) => void
  /** Projets ouverts, affichés à côté du nombre de terrains. */
  openProjects?: number
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<LeafletMap | null>(null)
  const shapes = useRef<{ remove: () => void }[]>([])
  const [ready, setReady] = useState(false)
  // Le regroupement dépend du zoom : il faut donc le suivre.
  const [zoom, setZoom] = useState(MOROCCO_ZOOM)
  const framed = useRef(false)
  const { base, setBase, overlays, setOverlays } = useMapLayers(map, ready)

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

      map.current.on('zoomend', () => {
        if (map.current) setZoom(map.current.getZoom())
      })

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

      // Seuls les terrains situables entrent dans le regroupement.
      const points = lands
        .filter((land) => land.map_lat != null && land.map_lng != null)
        .map((land) => ({ id: land.id, lat: land.map_lat!, lng: land.map_lng!, land }))

      for (const cluster of clusterPoints(points, zoom, DETAIL_ZOOM)) {
        // Une grappe : un disque chiffré, qui zoome au clic.
        if (cluster.items.length > 1) {
          const radius = Math.min(34, 15 + Math.sqrt(cluster.items.length) * 3.4)
          const marker = L.marker([cluster.lat, cluster.lng], {
            icon: L.divIcon({
              className: '',
              iconSize: [radius * 2, radius * 2],
              iconAnchor: [radius, radius],
              html: `<div style="
                width:${radius * 2}px;height:${radius * 2}px;
                display:grid;place-items:center;border-radius:9999px;
                background:${marketColor('disponible')};
                border:3px solid rgba(255,255,255,.85);
                box-shadow:0 2px 8px rgba(0,0,0,.25);
                color:#fff;font-weight:700;
                font-size:${Math.max(11, Math.min(16, radius * 0.6))}px;
                ">${cluster.items.length}</div>`,
            }),
          })

          marker.bindTooltip(`${cluster.items.length} ${t.map.landsHere}`, { direction: 'top' })
          marker.on('click', () => {
            // Zoomer d'un cran de plus que le seuil de scission : le clic doit
            // toujours faire progresser, jamais laisser le disque intact.
            map.current?.setView([cluster.lat, cluster.lng], Math.min(DETAIL_ZOOM, zoom + 2))
          })
          marker.addTo(map.current)
          shapes.current.push(marker)
          bounds.extend([cluster.lat, cluster.lng])
          continue
        }

        // Un seul terrain : son contour réel s'il en a un, sinon un marqueur.
        const { land } = cluster.items[0]
        const color = marketColor(land.market_status)
        const vertices = polygonToVertices(land.parcel)

        if (vertices.length) {
          const polygon = L.polygon(vertices, {
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.35,
          })
          polygon.addTo(map.current)
          polygon.bindPopup(popupHtml(land, t, locale))
          if (onSelect) polygon.on('click', () => onSelect(land.id))
          shapes.current.push(polygon)
          bounds.extend(polygon.getBounds())
        } else {
          // Pastille de taille fixe : un cercle de quelques dizaines de mètres
          // serait invisible dès qu'on dézoome un peu.
          const marker = L.marker([cluster.lat, cluster.lng], {
            icon: L.divIcon({
              className: '',
              iconSize: [22, 22],
              iconAnchor: [11, 11],
              html: `<div style="
                width:22px;height:22px;border-radius:9999px;
                background:${color};
                border:3px solid rgba(255,255,255,.85);
                box-shadow:0 1px 5px rgba(0,0,0,.3);"></div>`,
            }),
          })
          marker.addTo(map.current)
          marker.bindPopup(popupHtml(land, t, locale))
          if (onSelect) marker.on('click', () => onSelect(land.id))
          shapes.current.push(marker)
          bounds.extend([cluster.lat, cluster.lng])
        }
      }

      // Le cadrage initial seulement : recadrer à chaque zoom empêcherait
      // l'utilisateur de se déplacer.
      if (!framed.current && bounds.isValid()) {
        map.current.fitBounds(bounds.pad(0.2), { maxZoom: 12 })
        framed.current = true
      }
    }

    void draw()
    return () => {
      cancelled = true
    }
  }, [ready, lands, zoom, t, locale, onSelect])

  return (
    <div>
      <div className="relative">
        <div
          ref={container}
          style={{ height }}
          className="w-full overflow-hidden rounded-xl border border-sable-300 bg-sable-200"
          role="application"
          aria-label={t.map.title}
        />
        <MapCounters lands={lands.length} projects={openProjects} t={t} />
        <LayerControl
          base={base}
          setBase={setBase}
          overlays={overlays}
          setOverlays={setOverlays}
          t={t}
        />
      </div>
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
