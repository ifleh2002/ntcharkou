'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createProject } from '@/app/actions/projects'
import type { Dictionary, Locale } from '@/lib/i18n'
import { createFormatter } from '@/lib/format'
import { PROPERTY_NEED_ORDER, ZONING_ORDER } from '@/lib/labels'
import type { City, ProfessionalBody, PropertyNeed, Region } from '@/lib/types'
import { CityOptions } from './city-options'
import { Alert, Button, Field } from './ui'

export function ProjectForm({
  regions,
  cities,
  defaults,
  t,
  locale,
}: {
  regions: Region[]
  cities: City[]
  t: Dictionary
  locale: Locale
  defaults?: {
    land_id?: string
    region_code?: string
    city_id?: string | null
    zoning?: string | null
    units?: number | null
    title?: string
  }
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [region, setRegion] = useState(defaults?.region_code ?? '')
  const [units, setUnits] = useState(defaults?.units ? String(defaults.units) : '')
  const [budget, setBudget] = useState('')

  // `locale` plutôt qu'un objet de formatage : les props d'un composant client
  // traversent la frontière serveur/client et doivent rester sérialisables.
  // `createFormatter` est une fonction pure, on la rejoue donc ici.
  const f = useMemo(() => createFormatter(locale, t), [locale, t])

  const totalBudget = useMemo(() => {
    const u = Number(units)
    const b = Number(budget)
    if (!Number.isFinite(u) || !Number.isFinite(b) || u <= 0 || b <= 0) return null
    return u * b
  }, [units, budget])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const result = await createProject(new FormData(event.currentTarget))
    if (result.error || !result.projectId) {
      setError(result.error ?? t.projectForm.errCreate)
      setBusy(false)
      return
    }
    router.push(`/mes-projets/${result.projectId}?cree=1`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {defaults?.land_id ? <input type="hidden" name="land_id" value={defaults.land_id} /> : null}

      <section className="surface p-6">
        <h2 className="text-lg font-bold text-encre-900">{t.projectForm.projectTitle}</h2>

        <div className="mt-5 space-y-4">
          <Field
            label={t.projectForm.groupName}
            htmlFor="title"
            hint={t.projectForm.groupNameHint}
          >
            <input
              id="title"
              name="title"
              className="champ"
              defaultValue={defaults?.title ?? ''}
              placeholder={t.projectForm.groupNamePlaceholder}
            />
          </Field>

          <Field label={t.projectForm.summary} htmlFor="summary">
            <input
              id="summary"
              name="summary"
              className="champ"
              placeholder={t.projectForm.summaryPlaceholder}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.common.region} htmlFor="region_code" required>
              <select
                id="region_code"
                name="region_code"
                required
                className="champ"
                value={region}
                onChange={(event) => setRegion(event.target.value)}
              >
                <option value="">{t.landForm.chooseRegion}</option>
                {regions.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t.common.city} htmlFor="city_id">
              <select
                id="city_id"
                name="city_id"
                className="champ"
                defaultValue={defaults?.city_id ?? ''}
              >
                <option value="">—</option>
                <CityOptions cities={cities} regions={regions} region={region} />
              </select>
            </Field>

            <Field label={t.common.district} htmlFor="district">
              <input id="district" name="district" className="champ" />
            </Field>

            <Field label={t.projectForm.housingType} htmlFor="property_need" required>
              <select id="property_need" name="property_need" required className="champ" defaultValue="">
                <option value="">{t.projectForm.chooseTypology}</option>
                {PROPERTY_NEED_ORDER.map((key) => (
                  <option key={key} value={key}>
                    {t.enums.propertyNeed[key]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t.projectForm.zoningTarget} htmlFor="zoning">
              <select
                id="zoning"
                name="zoning"
                className="champ"
                defaultValue={defaults?.zoning ?? ''}
              >
                <option value="">—</option>
                {ZONING_ORDER.map((zoning) => (
                  <option key={zoning} value={zoning}>
                    {t.enums.zoning[zoning]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t.projectForm.unitsPlanned} htmlFor="units_planned" required>
              <input
                id="units_planned"
                name="units_planned"
                type="number"
                min="1"
                required
                className="champ"
                value={units}
                onChange={(event) => setUnits(event.target.value)}
              />
            </Field>

            <Field
              label={t.projectForm.participantsTarget}
              htmlFor="participants_target"
              required
              hint={t.projectForm.participantsTargetHint}
            >
              <input
                id="participants_target"
                name="participants_target"
                type="number"
                min="1"
                required
                className="champ"
                defaultValue={defaults?.units ?? ''}
              />
            </Field>

            <Field label={t.projectForm.budgetPerUnit} htmlFor="budget_per_unit">
              <input
                id="budget_per_unit"
                name="budget_per_unit"
                type="number"
                min="0"
                step="10000"
                className="champ"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
              />
            </Field>
          </div>

          <div className="rounded-lg border border-zellige-200 bg-zellige-50 p-4">
            <p className="text-xs font-semibold tracking-wide text-zellige-700 uppercase">
              {t.projectForm.totalEnvelope}
            </p>
            <p className="mt-1 text-xl font-bold text-zellige-800">
              {totalBudget !== null ? f.dh(totalBudget) : '—'}
            </p>
          </div>
        </div>
      </section>

      <section className="surface p-6">
        <h2 className="text-lg font-bold text-encre-900">{t.projectForm.bodyTitle}</h2>
        <p className="mt-1 text-sm text-encre-500">
          {t.projectForm.bodyLead}
        </p>
        <div className="mt-4 max-w-sm">
          <Field label={t.projectForm.bodyField} htmlFor="restricted_to_body">
            <select id="restricted_to_body" name="restricted_to_body" className="champ" defaultValue="">
              <option value="">{t.projectForm.bodyOpen}</option>
              {(Object.keys(t.enums.professionalBody) as ProfessionalBody[]).map((key) => (
                <option key={key} value={key}>
                  {t.enums.professionalBody[key]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="surface p-6">
        <Field label={t.projectForm.description} htmlFor="description">
          <textarea
            id="description"
            name="description"
            rows={6}
            className="champ"
            placeholder={t.projectForm.descriptionPlaceholder}
          />
        </Field>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" variant="collectif" disabled={busy}>
          {busy ? t.projectForm.creating : t.projectForm.submit}
        </Button>
        <p className="text-sm text-encre-400">
          {t.projectForm.submitNote}
        </p>
      </div>
    </form>
  )
}
