'use client'

import type { Map as LeafletMap, TileLayer } from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import type { Dictionary } from '@/lib/i18n'
import { BASE_LAYERS, DEFAULT_LAYER, DEFAULT_OVERLAYS, OVERLAYS, findLayer } from '@/lib/map'

/**
 * Gestion des fonds et calques d'une carte Leaflet.
 *
 * Le fond est exclusif — un seul à la fois — tandis que les calques se
 * cumulent : routes et noms de villes peuvent coexister sur une image satellite.
 * D'où deux états distincts, et deux commandes distinctes dans le menu.
 *
 * Les calques sont ajoutés après le fond et gardent un `zIndex` supérieur :
 * dans l'ordre inverse, une image satellite masquerait les libellés.
 */
export function useMapLayers(map: React.RefObject<LeafletMap | null>, ready: boolean) {
  const [base, setBase] = useState(DEFAULT_LAYER)
  const [overlays, setOverlays] = useState<string[]>(DEFAULT_OVERLAYS)

  const baseLayer = useRef<TileLayer | null>(null)
  const overlayLayers = useRef<Map<string, TileLayer>>(new globalThis.Map())

  useEffect(() => {
    if (!ready || !map.current) return
    let cancelled = false

    async function apply() {
      const L = await import('leaflet')
      if (cancelled || !map.current) return

      const chosen = findLayer(base)
      baseLayer.current?.remove()
      baseLayer.current = L.tileLayer(chosen.url, {
        attribution: chosen.attribution,
        maxZoom: chosen.maxZoom,
        // Au-delà du zoom natif du fond, on agrandit la dernière tuile plutôt
        // que d'afficher du vide : le relief s'arrête à 13, la parcelle non.
        maxNativeZoom: chosen.maxZoom,
      }).addTo(map.current)
      baseLayer.current.setZIndex(1)

      for (const overlay of OVERLAYS) {
        const active = overlays.includes(overlay.id)
        const existing = overlayLayers.current.get(overlay.id)

        if (active && !existing) {
          const layer = L.tileLayer(overlay.url, {
            attribution: overlay.attribution,
            maxZoom: overlay.maxZoom,
            maxNativeZoom: overlay.maxZoom,
          }).addTo(map.current)
          layer.setZIndex(2)
          overlayLayers.current.set(overlay.id, layer)
        } else if (!active && existing) {
          existing.remove()
          overlayLayers.current.delete(overlay.id)
        } else if (active && existing) {
          // Le fond vient d'être recréé : les calques doivent repasser dessus.
          existing.setZIndex(2)
        }
      }
    }

    void apply()
    return () => {
      cancelled = true
    }
  }, [ready, map, base, overlays])

  return { base, setBase, overlays, setOverlays }
}

/** Menu de choix du fond et des calques, posé sur la carte. */
export function LayerControl({
  base,
  setBase,
  overlays,
  setOverlays,
  t,
}: {
  base: string
  setBase: (id: string) => void
  overlays: string[]
  setOverlays: (ids: string[]) => void
  t: Dictionary
}) {
  const [open, setOpen] = useState(false)

  function toggleOverlay(id: string) {
    setOverlays(overlays.includes(id) ? overlays.filter((o) => o !== id) : [...overlays, id])
  }

  return (
    // `z-[400]` : Leaflet monte ses propres panneaux jusqu'à 400 ; en dessous,
    // le menu passerait derrière les tuiles.
    <div className="absolute top-3 end-3 z-[400]">
      <details
        open={open}
        onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
        className="rounded-lg border border-sable-300 bg-white/95 shadow-md backdrop-blur"
      >
        <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-encre-900">
          🗺️ {t.map.layersMenu}
        </summary>

        <div className="border-t border-sable-200 px-3 py-2">
          <fieldset>
            <legend className="text-xs font-semibold tracking-wide text-encre-400 uppercase">
              {t.map.background}
            </legend>
            <div className="mt-1.5 space-y-1">
              {BASE_LAYERS.map((layer) => (
                <label
                  key={layer.id}
                  className="flex items-center gap-2 text-sm whitespace-nowrap text-encre-700"
                >
                  <input
                    type="radio"
                    name="fond"
                    checked={base === layer.id}
                    onChange={() => setBase(layer.id)}
                    className="size-3.5 accent-[var(--color-argile-500)]"
                  />
                  {t.map.layers[layer.labelKey]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-3 border-t border-sable-200 pt-2">
            <legend className="text-xs font-semibold tracking-wide text-encre-400 uppercase">
              {t.map.overlays}
            </legend>
            <div className="mt-1.5 space-y-1">
              {OVERLAYS.map((overlay) => (
                <label
                  key={overlay.id}
                  className="flex items-center gap-2 text-sm whitespace-nowrap text-encre-700"
                >
                  <input
                    type="checkbox"
                    checked={overlays.includes(overlay.id)}
                    onChange={() => toggleOverlay(overlay.id)}
                    className="size-3.5 accent-[var(--color-argile-500)]"
                  />
                  {t.map.layers[overlay.labelKey]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </details>
    </div>
  )
}

/** Compteurs posés sur la carte : ce qui est offert, ce qui est déjà constitué. */
export function MapCounters({
  lands,
  projects,
  t,
}: {
  lands: number
  projects: number
  t: Dictionary
}) {
  return (
    <div className="absolute top-3 start-3 z-[400] flex gap-1.5 rounded-full bg-white/95 p-1 shadow-md backdrop-blur">
      {[
        { label: t.home.mapLands, value: lands, className: 'bg-zellige-500' },
        { label: t.home.mapProjects, value: projects, className: 'bg-blue-600' },
      ].map((item) => (
        <span
          key={item.label}
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-white ${item.className}`}
        >
          <span className="hidden sm:inline">{item.label}</span>
          <span className="rounded-full bg-white/25 px-2 py-0.5 tabular-nums">{item.value}</span>
        </span>
      ))}
    </div>
  )
}
