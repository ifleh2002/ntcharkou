import type { Region } from '@/lib/types'
import { Button } from './ui'

/** Barre de recherche de la page d'accueil (section 24) — formulaire GET simple. */
export function SearchBar({
  regions,
  action,
  placeholder,
  allRegions,
  regionLabel,
  submitLabel,
}: {
  regions: Region[]
  action: string
  placeholder: string
  allRegions: string
  regionLabel: string
  submitLabel: string
}) {
  return (
    <form action={action} method="get" className="surface flex flex-col gap-3 p-4 sm:flex-row">
      <div className="flex-1">
        <label className="sr-only" htmlFor="recherche-q">
          {placeholder}
        </label>
        <input
          id="recherche-q"
          name="q"
          type="search"
          className="champ"
          placeholder={`🔎 ${placeholder}`}
        />
      </div>
      <div className="sm:w-64">
        <label className="sr-only" htmlFor="recherche-region">
          {regionLabel}
        </label>
        <select id="recherche-region" name="region" className="champ" defaultValue="">
          <option value="">{allRegions}</option>
          {regions.map((region) => (
            <option key={region.code} value={region.code}>
              {region.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="md" className="sm:px-8">
        {submitLabel}
      </Button>
    </form>
  )
}
