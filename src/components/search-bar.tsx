import type { Region } from '@/lib/types'
import { Button } from './ui'

/** Barre de recherche de la page d'accueil (section 24) — formulaire GET simple. */
export function SearchBar({ regions }: { regions: Region[] }) {
  return (
    <form action="/terrains" method="get" className="surface flex flex-col gap-3 p-4 sm:flex-row">
      <div className="flex-1">
        <label className="sr-only" htmlFor="recherche-q">
          Où souhaitez-vous construire ?
        </label>
        <input
          id="recherche-q"
          name="q"
          type="search"
          className="champ"
          placeholder="🔎 Où souhaitez-vous construire ?"
        />
      </div>
      <div className="sm:w-64">
        <label className="sr-only" htmlFor="recherche-region">
          Région
        </label>
        <select id="recherche-region" name="region" className="champ" defaultValue="">
          <option value="">Toutes les régions</option>
          {regions.map((region) => (
            <option key={region.code} value={region.code}>
              {region.name_fr}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="md" className="sm:px-8">
        Rechercher
      </Button>
    </form>
  )
}
