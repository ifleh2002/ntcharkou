'use client'

import 'leaflet/dist/leaflet.css'
import type { Map as LeafletMap, Layer } from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import type { Dictionary } from '@/lib/i18n'
import { MOROCCO_CENTER } from '@/lib/map'

export interface RegionActivity {
  code: string
  name_fr: string
  name_ar: string
  latitude: number
  longitude: number
  lands: number
  projects: number
}

/** Terrains et projets ne disent pas la même chose : deux couleurs, deux séries. */
const LAND_COLOR = '#1f6b5a' // zellige — ce qui est offert
const PROJECT_COLOR = '#2563eb' // bleu — ce qui est déjà constitué

/**
 * Rayon d'une pastille, en pixels.
 *
 * Racine carrée du compte : c'est la SURFACE du disque qui doit suivre la
 * quantité, pas son rayon. Proportionner le rayon exagérerait visuellement les
 * grands nombres — une région à 100 paraîtrait dix fois plus fournie qu'une
 * région à 10, alors qu'elle ne l'est que dix fois.
 */
function bubbleRadius(count: number): number {
  if (count <= 0) return 0
  return Math.min(38, 14 + Math.sqrt(count) * 3.2)
}

/**
 * Carte de l'activité par région.
 *
 * Chaque région porte deux pastilles chiffrées : les terrains proposés et les
 * projets ouverts. Elles sont légèrement décalées l'une de l'autre pour rester
 * lisibles côte à côte, et une région sans activité n'affiche rien du tout.
 */
export function ActivityMap({
  regions,
  t,
  locale,
  height = 480,
}: {
  regions: RegionActivity[]
  t: Dictionary
  locale: string
  height?: number
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<LeafletMap | null>(null)
  const layers = useRef<Layer[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      const L = await import('leaflet')
      if (cancelled || !container.current || map.current) return

      map.current = L.map(container.current, {
        center: MOROCCO_CENTER,
        zoom: 5,
        scrollWheelZoom: false, // sinon la page ne défile plus au survol
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 12,
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

  useEffect(() => {
    if (!ready || !map.current) return
    let cancelled = false

    async function draw() {
      const L = await import('leaflet')
      if (cancelled || !map.current) return

      layers.current.forEach((layer) => layer.remove())
      layers.current = []

      const bounds = L.latLngBounds([])

      for (const region of regions) {
        const name = locale === 'ar' ? region.name_ar : region.name_fr

        const series = [
          { count: region.lands, color: LAND_COLOR, label: t.home.mapLands, shift: -0.28 },
          { count: region.projects, color: PROJECT_COLOR, label: t.home.mapProjects, shift: 0.28 },
        ]

        for (const item of series) {
          if (item.count <= 0) continue

          const radius = bubbleRadius(item.count)
          const position: [number, number] = [
            region.latitude,
            region.longitude + item.shift,
          ]

          const marker = L.marker(position, {
            icon: L.divIcon({
              className: '',
              iconSize: [radius * 2, radius * 2],
              iconAnchor: [radius, radius],
              html: `<div style="
                width:${radius * 2}px;height:${radius * 2}px;
                display:grid;place-items:center;
                border-radius:9999px;
                background:${item.color};
                border:3px solid rgba(255,255,255,.85);
                box-shadow:0 2px 8px rgba(0,0,0,.25);
                color:#fff;font-weight:700;
                font-size:${Math.max(11, Math.min(16, radius * 0.6))}px;
                ">${item.count}</div>`,
            }),
          })

          marker.bindTooltip(`${name} — ${item.count} ${item.label}`, { direction: 'top' })
          marker.addTo(map.current)
          layers.current.push(marker)
          bounds.extend(position)
        }
      }

      if (bounds.isValid()) map.current.fitBounds(bounds.pad(0.25), { maxZoom: 7 })
    }

    void draw()
    return () => {
      cancelled = true
    }
  }, [ready, regions, t, locale])

  return (
    <div>
      <div
        ref={container}
        style={{ height }}
        className="w-full overflow-hidden rounded-xl border border-sable-300 bg-sable-200"
        role="application"
        aria-label={t.home.mapTitle}
      />

      {/* Sans légende, deux couleurs de pastilles ne veulent rien dire. */}
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {[
          { color: LAND_COLOR, label: t.home.mapLands },
          { color: PROJECT_COLOR, label: t.home.mapProjects },
        ].map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm text-encre-600">
            <span
              aria-hidden
              className="size-3.5 shrink-0 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
