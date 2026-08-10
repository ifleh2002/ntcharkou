'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createProject } from '@/app/actions/projects'
import { formatDh } from '@/lib/format'
import {
  PROFESSIONAL_BODY_LABELS,
  PROPERTY_NEED_LABELS,
  ZONING_LABELS,
  ZONING_ORDER,
} from '@/lib/labels'
import type { City, ProfessionalBody, PropertyNeed, Region } from '@/lib/types'
import { Alert, Button, Field } from './ui'

export function ProjectForm({
  regions,
  cities,
  defaults,
}: {
  regions: Region[]
  cities: City[]
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

  const visibleCities = useMemo(
    () => cities.filter((c) => !region || c.region_code === region),
    [cities, region],
  )

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
      setError(result.error ?? 'Création impossible.')
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
        <h2 className="text-lg font-bold text-encre-900">Le projet</h2>

        <div className="mt-5 space-y-4">
          <Field
            label="Nom du groupe"
            htmlFor="title"
            hint="Laissez vide pour un nom généré automatiquement, par exemple « Projet Médecins — 20 unités »."
          >
            <input
              id="title"
              name="title"
              className="champ"
              defaultValue={defaults?.title ?? ''}
              placeholder="Résidence des Médecins — Casablanca"
            />
          </Field>

          <Field label="Résumé" htmlFor="summary">
            <input
              id="summary"
              name="summary"
              className="champ"
              placeholder="Immeuble R+4 de 20 appartements, réservé aux médecins."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Région" htmlFor="region_code" required>
              <select
                id="region_code"
                name="region_code"
                required
                className="champ"
                value={region}
                onChange={(event) => setRegion(event.target.value)}
              >
                <option value="">Choisissez une région</option>
                {regions.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name_fr}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Ville" htmlFor="city_id">
              <select
                id="city_id"
                name="city_id"
                className="champ"
                defaultValue={defaults?.city_id ?? ''}
              >
                <option value="">—</option>
                {visibleCities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_fr}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Quartier" htmlFor="district">
              <input id="district" name="district" className="champ" />
            </Field>

            <Field label="Type de logement" htmlFor="property_need" required>
              <select id="property_need" name="property_need" required className="champ" defaultValue="">
                <option value="">Choisissez une typologie</option>
                {(Object.keys(PROPERTY_NEED_LABELS) as PropertyNeed[]).map((key) => (
                  <option key={key} value={key}>
                    {PROPERTY_NEED_LABELS[key]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Zonage visé" htmlFor="zoning">
              <select
                id="zoning"
                name="zoning"
                className="champ"
                defaultValue={defaults?.zoning ?? ''}
              >
                <option value="">—</option>
                {ZONING_ORDER.map((zoning) => (
                  <option key={zoning} value={zoning}>
                    {ZONING_LABELS[zoning]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Nombre de logements" htmlFor="units_planned" required>
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
              label="Participants recherchés"
              htmlFor="participants_target"
              required
              hint="Souvent égal au nombre de logements."
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

            <Field label="Budget par logement (DH)" htmlFor="budget_per_unit">
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
              Enveloppe totale du projet
            </p>
            <p className="mt-1 text-xl font-bold text-zellige-800">
              {totalBudget !== null ? formatDh(totalBudget) : '—'}
            </p>
          </div>
        </div>
      </section>

      <section className="surface p-6">
        <h2 className="text-lg font-bold text-encre-900">Groupe professionnel</h2>
        <p className="mt-1 text-sm text-encre-500">
          Vous pouvez réserver ce groupe à un corps professionnel précis — médecins, enseignants,
          ingénieurs… Laissez vide pour l’ouvrir à tous.
        </p>
        <div className="mt-4 max-w-sm">
          <Field label="Réservé au corps professionnel" htmlFor="restricted_to_body">
            <select id="restricted_to_body" name="restricted_to_body" className="champ" defaultValue="">
              <option value="">Ouvert à tous</option>
              {(Object.keys(PROFESSIONAL_BODY_LABELS) as ProfessionalBody[]).map((key) => (
                <option key={key} value={key}>
                  {PROFESSIONAL_BODY_LABELS[key]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="surface p-6">
        <Field label="Description détaillée" htmlFor="description">
          <textarea
            id="description"
            name="description"
            rows={6}
            className="champ"
            placeholder="Présentez le projet, le calendrier envisagé, le mode de financement…"
          />
        </Field>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" variant="collectif" disabled={busy}>
          {busy ? 'Création…' : 'Créer mon groupe'}
        </Button>
        <p className="text-sm text-encre-400">
          Votre groupe sera analysé par l’administration avant d’être ouvert aux candidatures.
        </p>
      </div>
    </form>
  )
}
