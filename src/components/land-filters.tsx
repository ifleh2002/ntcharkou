'use client'

import { useState } from 'react'
import { ZONING_LABELS, ZONING_ORDER } from '@/lib/labels'
import type { City, Region } from '@/lib/types'
import { CityOptions } from './city-options'
import { Button, Field } from './ui'

export interface LandFilterValues {
  q?: string
  region?: string
  city?: string
  zoning?: string[]
  budgetMin?: string
  budgetMax?: string
  surfaceMin?: string
  surfaceMax?: string
  unitsMin?: string
  sort?: string
}

/**
 * Panneau de filtres de la recherche de terrains.
 * Formulaire GET : l'URL reste partageable et la page est rendue cote serveur.
 */
export function LandFilters({
  regions,
  cities,
  values,
}: {
  regions: Region[]
  cities: City[]
  values: LandFilterValues
}) {
  const [region, setRegion] = useState(values.region ?? '')
  const [city, setCity] = useState(values.city ?? '')

  const selectedZoning = new Set(values.zoning ?? [])

  return (
    <form method="get" className="surface space-y-4 p-5">
      <Field label="Mot-clé" htmlFor="f-q">
        <input
          id="f-q"
          name="q"
          type="search"
          defaultValue={values.q ?? ''}
          className="champ"
          placeholder="Quartier, titre…"
        />
      </Field>

      <Field label="Région" htmlFor="f-region">
        <select
          id="f-region"
          name="region"
          className="champ"
          value={region}
          onChange={(event) => {
            setRegion(event.target.value)
            setCity('')
          }}
        >
          <option value="">Toutes les régions</option>
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name_fr}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Ville" htmlFor="f-city">
        <select
          id="f-city"
          name="city"
          className="champ"
          value={city}
          onChange={(event) => setCity(event.target.value)}
        >
          <option value="">Toutes les villes</option>
          <CityOptions cities={cities} regions={regions} region={region} />
        </select>
      </Field>

      <fieldset>
        <legend className="etiquette">Type / zonage</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {ZONING_ORDER.map((zoning) => (
            <label key={zoning} className="flex items-center gap-2 text-sm text-encre-700">
              <input
                type="checkbox"
                name="zonage"
                value={zoning}
                defaultChecked={selectedZoning.has(zoning)}
                className="size-4 accent-[var(--color-argile-500)]"
              />
              {ZONING_LABELS[zoning]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="etiquette">Budget total (DH)</legend>
        <div className="flex gap-2">
          <input
            name="budget_min"
            type="number"
            min="0"
            step="10000"
            defaultValue={values.budgetMin ?? ''}
            className="champ"
            placeholder="Min"
          />
          <input
            name="budget_max"
            type="number"
            min="0"
            step="10000"
            defaultValue={values.budgetMax ?? ''}
            className="champ"
            placeholder="Max"
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="etiquette">Surface (m²)</legend>
        <div className="flex gap-2">
          <input
            name="surface_min"
            type="number"
            min="0"
            step="50"
            defaultValue={values.surfaceMin ?? ''}
            className="champ"
            placeholder="Min"
          />
          <input
            name="surface_max"
            type="number"
            min="0"
            step="50"
            defaultValue={values.surfaceMax ?? ''}
            className="champ"
            placeholder="Max"
          />
        </div>
      </fieldset>

      <Field label="Nombre d'unités réalisables (minimum)" htmlFor="f-units">
        <input
          id="f-units"
          name="unites_min"
          type="number"
          min="1"
          defaultValue={values.unitsMin ?? ''}
          className="champ"
          placeholder="ex. 10"
        />
      </Field>

      <Field label="Trier par" htmlFor="f-sort">
        <select id="f-sort" name="tri" className="champ" defaultValue={values.sort ?? 'recent'}>
          <option value="recent">Plus récents</option>
          <option value="prix_asc">Prix croissant</option>
          <option value="prix_desc">Prix décroissant</option>
          <option value="surface_desc">Surface décroissante</option>
        </select>
      </Field>

      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1">
          Filtrer
        </Button>
        <a
          href="/terrains"
          className="inline-flex items-center justify-center rounded-lg border border-sable-400 bg-white px-4 py-2.5 text-sm font-semibold text-encre-900 hover:bg-sable-100"
        >
          Effacer
        </a>
      </div>
    </form>
  )
}
