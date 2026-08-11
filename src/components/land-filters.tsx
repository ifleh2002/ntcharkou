'use client'

import { useState } from 'react'
import type { Dictionary } from '@/lib/i18n'
import { ZONING_ORDER } from '@/lib/labels'
import type { City, Region } from '@/lib/types'
import { CityOptions } from './city-options'
import { FilterPending, useInstantFilters } from './instant-filters'
import { Field } from './ui'

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
 *
 * Les resultats se rafraichissent des la saisie : plus de bouton « Filtrer ».
 * Le formulaire reste malgre tout un `<form method="get">`, donc l'URL demeure
 * partageable, la page rendue cote serveur, et la recherche fonctionne meme
 * sans JavaScript.
 */
export function LandFilters({
  regions,
  cities,
  values,
  t,
  resetHref,
}: {
  regions: Region[]
  cities: City[]
  values: LandFilterValues
  t: Dictionary
  resetHref: string
}) {
  const [region, setRegion] = useState(values.region ?? '')
  const [city, setCity] = useState(values.city ?? '')
  const { formRef, onChange, onSubmit, pending } = useInstantFilters()

  const selectedZoning = new Set(values.zoning ?? [])

  return (
    <form
      ref={formRef}
      method="get"
      onChange={onChange}
      onSubmit={onSubmit}
      className="surface space-y-4 p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-encre-900">{t.common.filter}</p>
        <FilterPending pending={pending} label={t.common.updating} />
      </div>
      <Field label={t.lands.keyword} htmlFor="f-q">
        <input
          id="f-q"
          name="q"
          type="search"
          defaultValue={values.q ?? ''}
          className="champ"
          placeholder={t.lands.keywordPlaceholder}
        />
      </Field>

      <Field label={t.common.region} htmlFor="f-region">
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
          <option value="">{t.common.allRegions}</option>
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t.common.city} htmlFor="f-city">
        <select
          id="f-city"
          name="city"
          className="champ"
          value={city}
          onChange={(event) => setCity(event.target.value)}
        >
          <option value="">{t.common.allCities}</option>
          <CityOptions cities={cities} regions={regions} region={region} />
        </select>
      </Field>

      <fieldset>
        <legend className="etiquette">{t.lands.zoning}</legend>
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
              {t.enums.zoning[zoning]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="etiquette">{t.lands.budgetTotal}</legend>
        <div className="flex gap-2">
          <input
            name="budget_min"
            type="number"
            min="0"
            step="10000"
            defaultValue={values.budgetMin ?? ''}
            className="champ"
            placeholder={t.lands.min}
          />
          <input
            name="budget_max"
            type="number"
            min="0"
            step="10000"
            defaultValue={values.budgetMax ?? ''}
            className="champ"
            placeholder={t.lands.max}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="etiquette">{t.lands.surface}</legend>
        <div className="flex gap-2">
          <input
            name="surface_min"
            type="number"
            min="0"
            step="50"
            defaultValue={values.surfaceMin ?? ''}
            className="champ"
            placeholder={t.lands.min}
          />
          <input
            name="surface_max"
            type="number"
            min="0"
            step="50"
            defaultValue={values.surfaceMax ?? ''}
            className="champ"
            placeholder={t.lands.max}
          />
        </div>
      </fieldset>

      <Field label={t.lands.minUnits} htmlFor="f-units">
        <input
          id="f-units"
          name="unites_min"
          type="number"
          min="1"
          defaultValue={values.unitsMin ?? ''}
          className="champ"
          placeholder="10"
        />
      </Field>

      <Field label={t.lands.sortBy} htmlFor="f-sort">
        <select id="f-sort" name="tri" className="champ" defaultValue={values.sort ?? 'recent'}>
          <option value="recent">{t.lands.sortRecent}</option>
          <option value="prix_asc">{t.lands.sortPriceAsc}</option>
          <option value="prix_desc">{t.lands.sortPriceDesc}</option>
          <option value="surface_desc">{t.lands.sortSurfaceDesc}</option>
        </select>
      </Field>

      <div className="pt-1">
        {/* Pas de bouton « Filtrer » : l'application est immediate. Le lien de
            remise a zero reste un vrai lien, donc utilisable sans JavaScript. */}
        <a
          href={resetHref}
          className="inline-flex w-full items-center justify-center rounded-lg border border-sable-400 bg-white px-4 py-2.5 text-sm font-semibold text-encre-900 hover:bg-sable-100"
        >
          {t.common.clear}
        </a>
      </div>
    </form>
  )
}
