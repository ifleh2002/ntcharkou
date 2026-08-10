'use client'

import { useMemo } from 'react'
import type { City, Region } from '@/lib/types'

/**
 * Options d'un sélecteur de ville.
 *
 * Le référentiel compte près de 300 communes : afficher la liste à plat sans
 * contexte serait illisible. Tant qu'aucune région n'est choisie, les villes
 * sont donc regroupées par région ; dès qu'une région l'est, on retombe sur une
 * liste simple.
 */
export function CityOptions({
  cities,
  regions,
  region,
}: {
  cities: City[]
  regions: Region[]
  region: string
}) {
  const grouped = useMemo(() => {
    if (region) return null
    return regions
      .map((r) => ({
        region: r,
        cities: cities.filter((c) => c.region_code === r.code),
      }))
      .filter((group) => group.cities.length > 0)
  }, [cities, regions, region])

  if (grouped) {
    return (
      <>
        {grouped.map((group) => (
          <optgroup key={group.region.code} label={group.region.name_fr}>
            {group.cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name_fr}
              </option>
            ))}
          </optgroup>
        ))}
      </>
    )
  }

  return (
    <>
      {cities
        .filter((city) => city.region_code === region)
        .map((city) => (
          <option key={city.id} value={city.id}>
            {city.name_fr}
          </option>
        ))}
    </>
  )
}
