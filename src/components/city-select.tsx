'use client'

import { useMemo, useState } from 'react'
import type { City, Region } from '@/lib/types'
import { Field } from './ui'

/** Couple région / ville avec filtrage de la liste des villes. */
export function CitySelect({
  regions,
  cities,
  defaultRegion,
  defaultCity,
  regionName = 'region_code',
  cityName = 'city_id',
  labels = { region: 'Région', city: 'Ville' },
  required = false,
}: {
  regions: Region[]
  cities: City[]
  defaultRegion?: string
  defaultCity?: string
  regionName?: string
  cityName?: string
  labels?: { region: string; city: string }
  required?: boolean
}) {
  const [region, setRegion] = useState(defaultRegion ?? '')
  const [city, setCity] = useState(defaultCity ?? '')

  const visibleCities = useMemo(
    () => cities.filter((c) => !region || c.region_code === region),
    [cities, region],
  )

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={labels.region} htmlFor={regionName} required={required}>
        <select
          id={regionName}
          name={regionName}
          className="champ"
          required={required}
          value={region}
          onChange={(event) => {
            setRegion(event.target.value)
            setCity('')
          }}
        >
          <option value="">—</option>
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name_fr}
            </option>
          ))}
        </select>
      </Field>

      <Field label={labels.city} htmlFor={cityName}>
        <select
          id={cityName}
          name={cityName}
          className="champ"
          value={city}
          onChange={(event) => setCity(event.target.value)}
        >
          <option value="">—</option>
          {visibleCities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_fr}
            </option>
          ))}
        </select>
      </Field>
    </div>
  )
}
