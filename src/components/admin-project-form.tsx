'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { createProjectFromLand } from '@/app/actions/admin'
import { createFormatter } from '@/lib/format'
import type { Dictionary, Locale } from '@/lib/i18n'
import { localePath } from '@/lib/i18n/config'
import { PROPERTY_NEED_ORDER } from '@/lib/labels'
import { BilingualField } from './bilingual-field'
import { Alert, Button, Checkbox, Field } from './ui'

export interface ProjectableLand {
  id: string
  reference: string | null
  title: string
  region_name: string | null
  city_name: string | null
  surface_m2: number
  zoning: string
  price_per_m2: number | null
  total_price: number | null
  estimated_units: number | null
  has_project: boolean
}

/**
 * Création d'un projet participatif à partir d'un terrain validé.
 *
 * Le formulaire ne propose que des terrains ayant passé la vérification
 * administrative : la fonction SQL refuserait les autres, autant ne pas les
 * offrir. La localisation, le zonage et la surface sont repris du terrain, donc
 * jamais re-saisis.
 */
export function AdminProjectForm({
  lands,
  t,
  locale,
}: {
  lands: ProjectableLand[]
  t: Dictionary
  locale: Locale
}) {
  const router = useRouter()
  const f = useMemo(() => createFormatter(locale, t), [locale, t])

  const [landId, setLandId] = useState('')
  const [units, setUnits] = useState('')
  const [unitSurface, setUnitSurface] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [marketPrice, setMarketPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const land = lands.find((item) => item.id === landId) ?? null

  // Aperçu du comparatif tel que le verra le participant, calculé pendant la
  // saisie : l'administration ne publie pas une grille à l'aveugle.
  const preview = useMemo(() => {
    const surface = Number(unitSurface)
    const participatory = Number(unitPrice)
    const market = Number(marketPrice)
    if (!surface || !participatory) return null
    const unit = surface * participatory
    const marketUnit = market ? surface * market : null
    return {
      unit,
      marketUnit,
      savings: marketUnit ? marketUnit - unit : null,
      percent: marketUnit && marketUnit > 0 ? ((marketUnit - unit) / marketUnit) * 100 : null,
    }
  }, [unitSurface, unitPrice, marketPrice])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const result = await createProjectFromLand(new FormData(event.currentTarget))
    if (result.error) {
      setError(result.error)
      setBusy(false)
      return
    }
    router.push(localePath(locale, '/admin/projets'))
  }

  if (lands.length === 0) {
    return (
      <Alert tone="info" title={t.adminProjects.noLandTitle}>
        {t.adminProjects.noLandBody}
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? <Alert tone="danger">
            <span className="whitespace-pre-line">{error}</span>
          </Alert> : null}

      <section className="surface space-y-4 p-5">
        <h2 className="font-semibold text-encre-900">{t.adminProjects.stepLand}</h2>

        <Field label={t.adminProjects.land} htmlFor="land_id" required>
          <select
            id="land_id"
            name="land_id"
            required
            className="champ"
            value={landId}
            onChange={(event) => {
              setLandId(event.target.value)
              const next = lands.find((item) => item.id === event.target.value)
              if (next?.estimated_units) setUnits(String(next.estimated_units))
            }}
          >
            <option value="">{t.adminProjects.choose}</option>
            {lands.map((item) => (
              <option key={item.id} value={item.id}>
                {item.reference ? `${item.reference} — ` : ''}
                {item.title} ({item.city_name ?? item.region_name}, {f.surface(item.surface_m2)})
                {item.has_project ? ` — ${t.adminProjects.alreadyLinked}` : ''}
              </option>
            ))}
          </select>
        </Field>

        {land ? (
          <dl className="grid grid-cols-2 gap-3 rounded-lg bg-sable-100 p-3 text-sm sm:grid-cols-4">
            {[
              { label: t.lands.surfaceLabel, value: f.surface(land.surface_m2) },
              { label: t.lands.zoning, value: t.enums.zoning[land.zoning as never] ?? land.zoning },
              { label: t.lands.totalPrice, value: f.dhCompact(land.total_price) },
              {
                label: t.lands.buildableUnits,
                value: land.estimated_units ? `≈ ${land.estimated_units}` : '—',
              },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-xs text-encre-400">{item.label}</dt>
                <dd className="font-semibold text-encre-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      <section className="surface space-y-4 p-5">
        <h2 className="font-semibold text-encre-900">{t.adminProjects.stepProject}</h2>

        <BilingualField
          name="title"
          label={t.adminProjects.projectTitle}
          labelAr={t.adminProjects.projectTitleAr}
          hintAr={t.landForm.arabicHint}
          required
          placeholder={t.adminProjects.titlePlaceholder}
        />

        <BilingualField
          name="summary"
          label={t.adminProjects.summary}
          labelAr={t.adminProjects.summaryAr}
          hintAr={t.landForm.arabicHint}
        />

        <BilingualField
          name="description"
          label={t.adminProjects.description}
          labelAr={t.adminProjects.descriptionAr}
          hintAr={t.landForm.arabicHint}
          rows={3}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.projects.typology} htmlFor="property_need" required>
            <select id="property_need" name="property_need" required className="champ">
              {PROPERTY_NEED_ORDER.map((key) => (
                <option key={key} value={key}>
                  {t.enums.propertyNeed[key]}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.adminProjects.restrictedTo} htmlFor="restricted_to_body">
            <select id="restricted_to_body" name="restricted_to_body" className="champ">
              <option value="">{t.adminProjects.noRestriction}</option>
              {(Object.keys(t.enums.professionalBody) as (keyof typeof t.enums.professionalBody)[]).map(
                (key) => (
                  <option key={key} value={key}>
                    {t.enums.professionalBodyPlural[key]}
                  </option>
                ),
              )}
            </select>
          </Field>
        </div>
      </section>

      <section className="surface space-y-4 p-5">
        <h2 className="font-semibold text-encre-900">{t.adminProjects.stepPricing}</h2>
        <p className="text-sm text-encre-500">{t.adminProjects.pricingHint}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.adminProjects.units} htmlFor="units_planned" required>
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

          <Field label={t.adminProjects.unitSurfaceFrom} htmlFor="unit_surface_m2">
            <input
              id="unit_surface_m2"
              name="unit_surface_m2"
              type="number"
              min="1"
              step="0.5"
              className="champ"
              value={unitSurface}
              onChange={(event) => setUnitSurface(event.target.value)}
            />
          </Field>

          <Field label={t.adminProjects.unitPricePerM2From} htmlFor="unit_price_per_m2">
            <input
              id="unit_price_per_m2"
              name="unit_price_per_m2"
              type="number"
              min="0"
              step="50"
              className="champ"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
            />
          </Field>

          <Field
            label={t.adminProjects.marketPricePerM2}
            htmlFor="market_price_per_m2"
            hint={t.adminProjects.marketPriceHint}
          >
            <input
              id="market_price_per_m2"
              name="market_price_per_m2"
              type="number"
              min="0"
              step="50"
              className="champ"
              value={marketPrice}
              onChange={(event) => setMarketPrice(event.target.value)}
            />
          </Field>
        </div>

        {preview ? (
          <div className="rounded-lg border border-zellige-200 bg-zellige-50 p-4">
            <p className="text-xs font-semibold tracking-wide text-encre-400 uppercase">
              {t.adminProjects.preview}
            </p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
              <span className="text-sm text-encre-500">{t.projects.from}</span>
              <span className="text-2xl font-bold text-zellige-600">{f.dh(preview.unit)}</span>
              <span className="text-sm text-encre-500">{t.projects.perUnit}</span>
              {preview.marketUnit ? (
                <>
                  <span className="text-sm text-encre-500 line-through">
                    {f.dh(preview.marketUnit)}
                  </span>
                  <span className="text-sm font-semibold text-zellige-600">
                    −{f.percent(preview.percent)}
                  </span>
                </>
              ) : null}
            </p>
            {preview.savings && preview.savings > 0 ? (
              <p className="mt-1 text-sm text-encre-500">
                {t.adminProjects.savingsPerUnit} : {f.dh(preview.savings)}
              </p>
            ) : null}
          </div>
        ) : null}

        <Checkbox name="open" value="1" defaultChecked label={t.adminProjects.openNow} />
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? t.common.loading : t.adminProjects.create}
        </Button>
      </div>
    </form>
  )
}
