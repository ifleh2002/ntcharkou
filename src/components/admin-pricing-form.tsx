'use client'

import { useMemo, useState } from 'react'
import { setProjectPricing } from '@/app/actions/admin'
import { createFormatter } from '@/lib/format'
import type { Dictionary, Locale } from '@/lib/i18n'
import type { ProjectPublic } from '@/lib/types'
import { Alert, Button } from './ui'

/**
 * Grille tarifaire d'un projet, fixée « après étude ».
 *
 * Repliée par défaut : la liste des projets doit rester lisible, et la grille
 * n'est modifiée qu'occasionnellement. Le comparatif est recalculé pendant la
 * saisie pour que l'administration voie ce que verra le participant.
 */
export function AdminPricingForm({
  project,
  t,
  locale,
}: {
  project: ProjectPublic
  t: Dictionary
  locale: Locale
}) {
  const f = useMemo(() => createFormatter(locale, t), [locale, t])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const [units, setUnits] = useState(String(project.units_planned))
  const [surface, setSurface] = useState(project.unit_surface_m2?.toString() ?? '')
  const [price, setPrice] = useState(project.unit_price_per_m2?.toString() ?? '')
  const [market, setMarket] = useState(project.market_price_per_m2?.toString() ?? '')

  const preview = useMemo(() => {
    const s = Number(surface)
    const p = Number(price)
    const m = Number(market)
    if (!s || !p) return null
    const unit = s * p
    const marketUnit = m ? s * m : null
    return {
      unit,
      marketUnit,
      percent: marketUnit && marketUnit > 0 ? ((marketUnit - unit) / marketUnit) * 100 : null,
    }
  }, [surface, price, market])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setDone(false)

    const result = await setProjectPricing(new FormData(event.currentTarget))
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setDone(true)
  }

  if (!open) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        {project.unit_price ? (
          <span className="text-encre-700">
            {t.projects.from}{' '}
            <span className="font-semibold">{f.dhCompact(project.unit_price)}</span>{' '}
            {t.projects.perUnit}
            {project.savings_percent ? (
              <span className="ms-2 text-zellige-600">−{f.percent(project.savings_percent)}</span>
            ) : null}
          </span>
        ) : (
          <span className="text-encre-400">{t.adminProjects.noPricing}</span>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-semibold text-argile-600 hover:underline"
        >
          {t.adminProjects.editPricing}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-lg border border-sable-300 bg-sable-50 p-4">
      <input type="hidden" name="project_id" value={project.id} />

      {error ? (
        <div className="mb-3">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}
      {done ? (
        <div className="mb-3">
          <Alert tone="succes">{t.adminProjects.pricingSaved}</Alert>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          {
            name: 'units_planned',
            label: t.adminProjects.units,
            value: units,
            set: setUnits,
            step: '1',
          },
          {
            name: 'unit_surface_m2',
            label: t.adminProjects.unitSurfaceFrom,
            value: surface,
            set: setSurface,
            step: '0.5',
          },
          {
            name: 'unit_price_per_m2',
            label: t.adminProjects.unitPricePerM2From,
            value: price,
            set: setPrice,
            step: '50',
          },
          {
            name: 'market_price_per_m2',
            label: t.adminProjects.marketPricePerM2,
            value: market,
            set: setMarket,
            step: '50',
          },
        ].map((field) => (
          <label key={field.name} className="block">
            <span className="etiquette">{field.label}</span>
            <input
              name={field.name}
              type="number"
              min="0"
              step={field.step}
              value={field.value}
              onChange={(event) => field.set(event.target.value)}
              className="champ"
            />
          </label>
        ))}
      </div>

      {preview ? (
        <p className="mt-3 flex flex-wrap items-baseline gap-x-3 text-sm">
          <span className="text-encre-500">{t.projects.from}</span>
          <span className="font-bold text-zellige-600">{f.dh(preview.unit)}</span>
          <span className="text-encre-500">{t.projects.perUnit}</span>
          {preview.marketUnit ? (
            <>
              <span className="text-encre-500 line-through">{f.dh(preview.marketUnit)}</span>
              <span className="font-semibold text-zellige-600">−{f.percent(preview.percent)}</span>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? t.common.loading : t.common.save}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
          {t.common.cancel}
        </Button>
      </div>
    </form>
  )
}
