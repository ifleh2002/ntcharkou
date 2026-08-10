'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { saveRequest } from '@/app/actions/requests'
import type { Dictionary } from '@/lib/i18n'
import type { Formatter } from '@/lib/format'
import { PROPERTY_NEED_GROUPS } from '@/lib/labels'
import type {
  City,
  ParticipantProfile,
  ProfessionalBody,
  Profile,
  PropertyNeed,
  Region,
  SameBodyPreference,
} from '@/lib/types'
import { CityOptions } from './city-options'
import { Alert, Button, Checkbox, Field } from './ui'

export function RequestForm({
  regions,
  cities,
  profile,
  participantProfile,
  defaults,
  t,
  f,
}: {
  regions: Region[]
  cities: City[]
  profile: Profile
  participantProfile: ParticipantProfile | null
  t: Dictionary
  f: Formatter
  defaults?: {
    region_code?: string | null
    city_id?: string | null
    needs?: PropertyNeed[]
    budget_total_max?: number | null
  }
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [region, setRegion] = useState(defaults?.region_code ?? profile.region_code ?? '')
  const [sameBody, setSameBody] = useState<SameBodyPreference>('indifferent')
  const [needs, setNeeds] = useState<Set<PropertyNeed>>(new Set(defaults?.needs ?? []))
  const [units, setUnits] = useState('')
  const [budgetPerUnit, setBudgetPerUnit] = useState('')

  const impliedTotal = useMemo(() => {
    const u = Number(units)
    const b = Number(budgetPerUnit)
    if (!Number.isFinite(u) || !Number.isFinite(b) || u <= 0 || b <= 0) return null
    return u * b
  }, [units, budgetPerUnit])

  function toggleNeed(need: PropertyNeed) {
    setNeeds((current) => {
      const next = new Set(current)
      if (next.has(need)) next.delete(need)
      else next.add(need)
      return next
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (needs.size === 0) {
      setError(t.requestForm.errNeed)
      return
    }
    setBusy(true)
    setError(null)

    const result = await saveRequest(new FormData(event.currentTarget))
    if (result.error || !result.requestId) {
      setError(result.error ?? t.landForm.errSave)
      setBusy(false)
      return
    }
    router.push(`/mes-demandes/${result.requestId}?creee=1`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {/* --- Profil ------------------------------------------------------ */}
      <section className="surface p-6">
        <h2 className="text-lg font-bold text-encre-900">{t.requestForm.profileTitle}</h2>
        <p className="mt-1 text-sm text-encre-500">
          {t.requestForm.profileLead}
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label={t.requestForm.regionWanted} htmlFor="region_code">
            <select
              id="region_code"
              name="region_code"
              className="champ"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
            >
              <option value="">{t.common.indifferent}</option>
              {regions.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.requestForm.cityWanted} htmlFor="city_id">
            <select
              id="city_id"
              name="city_id"
              className="champ"
              defaultValue={defaults?.city_id ?? profile.city_id ?? ''}
            >
              <option value="">{t.common.indifferent}</option>
              <CityOptions cities={cities} regions={regions} region={region} />
            </select>
          </Field>

          <Field label={t.requestForm.districtWanted} htmlFor="district">
            <input
              id="district"
              name="district"
              className="champ"
              defaultValue={profile.district ?? ''}
            />
          </Field>

          <Field label={t.requestForm.professionalStatus} htmlFor="professional_status">
            <input
              id="professional_status"
              name="professional_status"
              className="champ"
              placeholder={t.requestForm.professionalStatusPlaceholder}
              defaultValue={participantProfile?.professional_status ?? ''}
            />
          </Field>

          <Field label={t.requestForm.professionalBody} htmlFor="professional_body">
            <select
              id="professional_body"
              name="professional_body"
              className="champ"
              defaultValue={participantProfile?.professional_body ?? 'autre'}
            >
              {(Object.keys(t.enums.professionalBody) as ProfessionalBody[]).map((key) => (
                <option key={key} value={key}>
                  {t.enums.professionalBody[key]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* --- Besoin immobilier (section 6) ------------------------------- */}
      <section className="surface p-6">
        <h2 className="text-lg font-bold text-encre-900">{t.requestForm.needTitle}</h2>
        <p className="mt-1 text-sm text-encre-500">
          {t.requestForm.needLead}
        </p>

        <div className="mt-5 space-y-5">
          {PROPERTY_NEED_GROUPS.map((group) => (
            <div key={group.key}>
              <h3 className="mb-2 text-sm font-semibold text-encre-700">
                {group.icon} {t.enums.propertyNeedGroups[group.key]}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.needs.map((need) => (
                  <Checkbox
                    key={need}
                    name="property_needs"
                    value={need}
                    checked={needs.has(need)}
                    onChange={() => toggleNeed(need)}
                    label={t.enums.propertyNeed[need]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {needs.size === 0 ? (
          <p className="mt-4 text-sm text-argile-600">{t.requestForm.needRequired}</p>
        ) : null}
      </section>

      {/* --- Budget et unites (sections 7 et 8) -------------------------- */}
      <section className="surface p-6">
        <h2 className="text-lg font-bold text-encre-900">{t.requestForm.budgetTitle}</h2>
        <p className="mt-1 text-sm text-encre-500">
          {t.requestForm.budgetLead}
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label={t.requestForm.budgetTotalMin} htmlFor="budget_total_min">
            <input
              id="budget_total_min"
              name="budget_total_min"
              type="number"
              min="0"
              step="10000"
              className="champ"
            />
          </Field>
          <Field label={t.requestForm.budgetTotalMax} htmlFor="budget_total_max">
            <input
              id="budget_total_max"
              name="budget_total_max"
              type="number"
              min="0"
              step="10000"
              className="champ"
              defaultValue={defaults?.budget_total_max ?? ''}
            />
          </Field>
          <Field label={t.requestForm.budgetUnitMin} htmlFor="budget_per_unit_min">
            <input
              id="budget_per_unit_min"
              name="budget_per_unit_min"
              type="number"
              min="0"
              step="10000"
              className="champ"
            />
          </Field>
          <Field label={t.requestForm.budgetUnitMax} htmlFor="budget_per_unit_max">
            <input
              id="budget_per_unit_max"
              name="budget_per_unit_max"
              type="number"
              min="0"
              step="10000"
              className="champ"
              value={budgetPerUnit}
              onChange={(event) => setBudgetPerUnit(event.target.value)}
            />
          </Field>
          <Field
            label={t.requestForm.unitsWanted}
            htmlFor="units_wanted"
            hint={t.requestForm.unitsHint}
          >
            <input
              id="units_wanted"
              name="units_wanted"
              type="number"
              min="1"
              className="champ"
              value={units}
              onChange={(event) => setUnits(event.target.value)}
            />
          </Field>
          <div className="rounded-lg border border-zellige-200 bg-zellige-50 p-4">
            <p className="text-xs font-semibold tracking-wide text-zellige-700 uppercase">
              {t.requestForm.impliedEnvelope}
            </p>
            <p className="mt-1 text-xl font-bold text-zellige-800">
              {impliedTotal !== null ? f.dh(impliedTotal) : '—'}
            </p>
            <p className="mt-1 text-xs text-encre-500">
              {impliedTotal !== null
                ? `${units} ${t.common.units} × ${f.dh(Number(budgetPerUnit))}`
                : t.requestForm.impliedHint}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t.requestForm.surfaceMin} htmlFor="surface_min_m2">
            <input id="surface_min_m2" name="surface_min_m2" type="number" min="0" className="champ" />
          </Field>
          <Field label={t.requestForm.surfaceMax} htmlFor="surface_max_m2">
            <input id="surface_max_m2" name="surface_max_m2" type="number" min="0" className="champ" />
          </Field>
        </div>
      </section>

      {/* --- Groupe professionnel (section 9) ---------------------------- */}
      <section className="surface p-6">
        <h2 className="text-lg font-bold text-encre-900">{t.requestForm.groupTitle}</h2>
        <p className="mt-1 text-sm text-encre-500">
          {t.requestForm.groupLead}
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {(Object.keys(t.enums.sameBody) as SameBodyPreference[]).map((key) => (
            <label
              key={key}
              className="cursor-pointer rounded-lg border border-sable-300 bg-white p-3 text-sm transition-colors has-checked:border-zellige-400 has-checked:bg-zellige-50"
            >
              <input
                type="radio"
                name="same_body_preference"
                value={key}
                checked={sameBody === key}
                onChange={() => setSameBody(key)}
                className="sr-only"
              />
              <span className="font-semibold text-encre-900">{t.enums.sameBodyShort[key]}</span>
              <span className="mt-0.5 block text-xs text-encre-500">{t.enums.sameBody[key]}</span>
            </label>
          ))}
        </div>

        {sameBody === 'oui' ? (
          <div className="mt-4 max-w-sm">
            <Field label={t.requestForm.groupWanted} htmlFor="preferred_body">
              <select id="preferred_body" name="preferred_body" className="champ" defaultValue="">
                <option value="">{t.requestForm.groupChoose}</option>
                {(Object.keys(t.enums.professionalBody) as ProfessionalBody[]).map((key) => (
                  <option key={key} value={key}>
                    {t.enums.professionalBody[key]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : null}
      </section>

      {/* --- Reseaux indispensables -------------------------------------- */}
      <section className="surface p-6">
        <h2 className="text-lg font-bold text-encre-900">{t.requestForm.networksTitle}</h2>
        <p className="mt-1 text-sm text-encre-500">
          {t.requestForm.networksLead}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Checkbox name="requires_water" value="on" label={`💧 ${t.enums.network.water}`} />
          <Checkbox name="requires_electricity" value="on" label={`⚡ ${t.enums.network.electricity}`} />
          <Checkbox name="requires_sewage" value="on" label={`🚰 ${t.enums.network.sewageShort}`} />
        </div>
      </section>

      {/* --- Intitule et notes ------------------------------------------- */}
      <section className="surface p-6">
        <Field
          label={t.requestForm.requestTitle}
          htmlFor="title"
          hint={t.requestForm.requestTitleHint}
        >
          <input
            id="title"
            name="title"
            className="champ"
            placeholder={t.requestForm.requestTitlePlaceholder}
          />
        </Field>
        <div className="mt-4">
          <Field label={t.requestForm.notes} htmlFor="notes">
            <textarea id="notes" name="notes" rows={4} className="champ" />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" variant="collectif" disabled={busy}>
          {busy ? t.common.saving : t.requestForm.submit}
        </Button>
        <p className="text-sm text-encre-400">
          {t.requestForm.submitNote}
        </p>
      </div>
    </form>
  )
}
