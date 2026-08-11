'use client'

import type { Dictionary } from '@/lib/i18n'
import { PROPERTY_NEED_ORDER } from '@/lib/labels'
import type { PropertyNeed, Region } from '@/lib/types'
import { FilterPending, useInstantFilters } from './instant-filters'

/**
 * Filtres de la liste des projets participatifs.
 * Meme principe que les filtres de terrains : application immediate, URL
 * partageable, repli sur la soumission GET sans JavaScript.
 */
export function ProjectFilters({
  regions,
  region,
  need,
  onlyOpen,
  t,
}: {
  regions: Region[]
  region?: string
  need?: PropertyNeed
  onlyOpen: boolean
  t: Dictionary
}) {
  const { formRef, onChange, onSubmit, pending } = useInstantFilters()

  return (
    <form
      ref={formRef}
      method="get"
      onChange={onChange}
      onSubmit={onSubmit}
      className="surface mb-8 flex flex-wrap items-end gap-3 p-4"
    >
      <div className="min-w-52 flex-1">
        <label className="etiquette" htmlFor="p-region">
          {t.common.region}
        </label>
        <select id="p-region" name="region" className="champ" defaultValue={region ?? ''}>
          <option value="">{t.common.allRegions}</option>
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-52 flex-1">
        <label className="etiquette" htmlFor="p-need">
          {t.projects.typology}
        </label>
        <select id="p-need" name="typologie" className="champ" defaultValue={need ?? ''}>
          <option value="">{t.projects.allTypologies}</option>
          {PROPERTY_NEED_ORDER.map((key) => (
            <option key={key} value={key}>
              {t.enums.propertyNeed[key]}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 pb-2.5 text-sm text-encre-700">
        <input
          type="checkbox"
          name="ouverts"
          value="1"
          defaultChecked={onlyOpen}
          className="size-4 accent-[var(--color-zellige-500)]"
        />
        {t.projects.onlyOpen}
      </label>

      <FilterPending pending={pending} label={t.common.updating} />
    </form>
  )
}
