'use client'

import 'leaflet/dist/leaflet.css'
import type { Map as LeafletMap, Marker, Polygon } from 'leaflet'
import { useCallback, useEffect, useRef, useState } from 'react'
import { saveParcel } from '@/app/actions/parcel'
import type { Dictionary } from '@/lib/i18n'
import {
  MOROCCO_CENTER,
  MOROCCO_ZOOM,
  type GeoPolygon,
  approximateArea,
  polygonToVertices,
  verticesToPolygon,
} from '@/lib/map'
import { Alert, Button } from './ui'

/**
 * Tracé d'une parcelle sur la carte.
 *
 * L'utilisateur clique les angles du terrain ; les points sont reliés dans
 * l'ordre et le contour se ferme tout seul. La surface affichée pendant le
 * tracé n'est qu'un aperçu : c'est PostGIS qui mesure à l'enregistrement, sur
 * l'ellipsoïde, et c'est cette valeur qui est conservée.
 */
export function ParcelEditor({
  landId,
  initial,
  center,
  t,
}: {
  landId: string
  initial: GeoPolygon | null
  center?: [number, number] | null
  t: Dictionary
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<LeafletMap | null>(null)
  const shape = useRef<Polygon | null>(null)
  const markers = useRef<Marker[]>([])

  const [vertices, setVertices] = useState<[number, number][]>(() => polygonToVertices(initial))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Les rappels Leaflet capturent la valeur au moment de l'abonnement : sans
  // cette référence, chaque clic repartirait du tableau vide initial.
  const current = useRef(vertices)
  current.current = vertices

  useEffect(() => {
    let cancelled = false

    async function boot() {
      const L = await import('leaflet')
      if (cancelled || !container.current || map.current) return

      const start = center ?? (vertices[0] as [number, number] | undefined) ?? MOROCCO_CENTER
      map.current = L.map(container.current, {
        center: start,
        zoom: center || vertices.length ? 17 : MOROCCO_ZOOM,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map.current)

      map.current.on('click', (event: { latlng: { lat: number; lng: number } }) => {
        setVertices([...current.current, [event.latlng.lat, event.latlng.lng]])
        setDone(false)
      })
    }

    void boot()
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
    }
    // Volontairement monté une seule fois : les sommets sont redessinés plus bas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Redessine contour et sommets à chaque modification.
  useEffect(() => {
    let cancelled = false

    async function draw() {
      const L = await import('leaflet')
      if (cancelled || !map.current) return

      shape.current?.remove()
      shape.current = null
      markers.current.forEach((marker) => marker.remove())
      markers.current = []

      if (vertices.length >= 3) {
        shape.current = L.polygon(vertices, {
          color: '#1f6b5a',
          weight: 2,
          fillColor: '#1f6b5a',
          fillOpacity: 0.3,
        }).addTo(map.current)
      } else if (vertices.length === 2) {
        // Deux points : on montre le segment, pour que le tracé en cours reste
        // visible avant d'atteindre les trois sommets.
        L.polyline(vertices, { color: '#1f6b5a', dashArray: '4 4' }).addTo(map.current)
      }

      vertices.forEach(([lat, lng], index) => {
        const marker = L.circleMarker([lat, lng], {
          radius: 5,
          color: '#a74c2c',
          fillColor: '#fff',
          fillOpacity: 1,
        })
          .addTo(map.current!)
          .bindTooltip(String(index + 1))
        markers.current.push(marker as unknown as Marker)
      })
    }

    void draw()
    return () => {
      cancelled = true
    }
  }, [vertices])

  const undo = useCallback(() => {
    setVertices((list) => list.slice(0, -1))
    setDone(false)
  }, [])

  const clear = useCallback(() => {
    setVertices([])
    setDone(false)
  }, [])

  async function save() {
    setBusy(true)
    setError(null)
    setDone(false)

    // Un tracé effacé vaut suppression : on transmet explicitement `null`
    // plutôt que de laisser l'ancien contour en base.
    const polygon = vertices.length === 0 ? null : verticesToPolygon(vertices)
    if (vertices.length > 0 && !polygon) {
      setError(t.map.needThreePoints)
      setBusy(false)
      return
    }

    const result = await saveParcel(landId, polygon)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setDone(true)
  }

  const preview = approximateArea(vertices)

  return (
    <div className="space-y-3">
      {error ? (
        <Alert tone="danger">
          <span className="whitespace-pre-line">{error}</span>
        </Alert>
      ) : null}
      {done ? <Alert tone="succes">{t.map.parcelSaved}</Alert> : null}

      <p className="text-sm text-encre-500">{t.map.drawHint}</p>

      <div
        ref={container}
        style={{ height: 460 }}
        className="w-full overflow-hidden rounded-xl border border-sable-300 bg-sable-200"
        role="application"
        aria-label={t.map.drawTitle}
      />

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-encre-700">
          {vertices.length} {t.map.points}
          {vertices.length >= 3 ? (
            <>
              {' · ≈ '}
              <span className="font-semibold">
                {new Intl.NumberFormat('fr-MA').format(Math.round(preview))} m²
              </span>
            </>
          ) : null}
        </span>

        <div className="ms-auto flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={undo}
            disabled={vertices.length === 0}
          >
            {t.map.undo}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={clear}
            disabled={vertices.length === 0}
          >
            {t.map.clear}
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={busy}>
            {busy ? t.common.loading : t.map.saveParcel}
          </Button>
        </div>
      </div>
    </div>
  )
}
