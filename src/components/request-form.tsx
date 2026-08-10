'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { saveRequest } from '@/app/actions/requests'
import { formatDh } from '@/lib/format'
import {
  PROFESSIONAL_BODY_LABELS,
  PROPERTY_NEED_GROUPS,
  PROPERTY_NEED_LABELS,
  SAME_BODY_LABELS,
} from '@/lib/labels'
import type {
  City,
  ParticipantProfile,
  ProfessionalBody,
  Profile,
  PropertyNeed,
  Region,
  SameBodyPreference,
} from '@/lib/types'
import { Alert, Button, Checkbox, Field } from './ui'

export function RequestForm({
  regions,
  cities,
  profile,
  participantProfile,
  defaults,
}: {
  regions: Region[]
  cities: City[]
  profile: Profile
  participantProfile: ParticipantProfile | null
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

  const visibleCities = useMemo(
    () => cities.filter((c) => !region || c.region_code === region),
    [cities, region],
  )

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
      setError('Sélectionnez au moins une typologie de bien recherchée.')
      return
    }
    setBusy(true)
    setError(null)

    const result = await saveRequest(new FormData(event.currentTarget))
    if (result.error || !result.requestId) {
      setError(result.error ?? 'Enregistrement impossible.')
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
        <h2 className="text-lg font-bold text-encre-900">Votre profil</h2>
        <p className="mt-1 text-sm text-encre-500">
          Ces informations affinent le matching et permettent de constituer des groupes cohérents.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Région recherchée" htmlFor="region_code">
            <select
              id="region_code"
              name="region_code"
              className="champ"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
            >
              <option value="">Indifférent</option>
              {regions.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name_fr}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Ville recherchée" htmlFor="city_id">
            <select
              id="city_id"
              name="city_id"
              className="champ"
              defaultValue={defaults?.city_id ?? profile.city_id ?? ''}
            >
              <option value="">Indifférent</option>
              {visibleCities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_fr}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Quartier souhaité" htmlFor="district">
            <input
              id="district"
              name="district"
              className="champ"
              defaultValue={profile.district ?? ''}
            />
          </Field>

          <Field label="Situation professionnelle" htmlFor="professional_status">
            <input
              id="professional_status"
              name="professional_status"
              className="champ"
              placeholder="Salarié, libéral, fonctionnaire…"
              defaultValue={participantProfile?.professional_status ?? ''}
            />
          </Field>

          <Field label="Corps / fonction" htmlFor="professional_body">
            <select
              id="professional_body"
              name="professional_body"
              className="champ"
              defaultValue={participantProfile?.professional_body ?? 'autre'}
            >
              {(Object.keys(PROFESSIONAL_BODY_LABELS) as ProfessionalBody[]).map((key) => (
                <option key={key} value={key}>
                  {PROFESSIONAL_BODY_LABELS[key]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* --- Besoin immobilier (section 6) ------------------------------- */}
      <section className="surface p-6">
        <h2 className="text-lg font-bold text-encre-900">Votre besoin immobilier</h2>
        <p className="mt-1 text-sm text-encre-500">
          Sélectionnez toutes les typologies qui vous conviennent — plusieurs choix sont possibles.
        </p>

        <div className="mt-5 space-y-5">
          {PROPERTY_NEED_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="mb-2 text-sm font-semibold text-encre-700">
                {group.icon} {group.label}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.needs.map((need) => (
                  <Checkbox
                    key={need}
                    name="property_needs"
                    value={need}
                    checked={needs.has(need)}
                    onChange={() => toggleNeed(need)}
                    label={PROPERTY_NEED_LABELS[need]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {needs.size === 0 ? (
          <p className="mt-4 text-sm text-argile-600">Au moins une typologie est nécessaire.</p>
        ) : null}
      </section>

      {/* --- Budget et unites (sections 7 et 8) -------------------------- */}
      <section className="surface p-6">
        <h2 className="text-lg font-bold text-encre-900">Budget et nombre d’unités</h2>
        <p className="mt-1 text-sm text-encre-500">
          Distinguer le budget total du budget par unité rend le matching nettement plus pertinent.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Budget total minimum (DH)" htmlFor="budget_total_min">
            <input
              id="budget_total_min"
              name="budget_total_min"
              type="number"
              min="0"
              step="10000"
              className="champ"
            />
          </Field>
          <Field label="Budget total maximum (DH)" htmlFor="budget_total_max">
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
          <Field label="Budget par unité — minimum (DH)" htmlFor="budget_per_unit_min">
            <input
              id="budget_per_unit_min"
              name="budget_per_unit_min"
              type="number"
              min="0"
              step="10000"
              className="champ"
            />
          </Field>
          <Field label="Budget par unité — maximum (DH)" htmlFor="budget_per_unit_max">
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
            label="Nombre d’unités souhaitées"
            htmlFor="units_wanted"
            hint="Par exemple : « je souhaite participer à un projet comprenant 10 unités »."
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
              Enveloppe implicite
            </p>
            <p className="mt-1 text-xl font-bold text-zellige-800">
              {impliedTotal !== null ? formatDh(impliedTotal) : '—'}
            </p>
            <p className="mt-1 text-xs text-encre-500">
              {impliedTotal !== null
                ? `${units} unités × ${formatDh(Number(budgetPerUnit))}`
                : 'Renseignez le budget par unité et le nombre d’unités.'}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Surface minimale du terrain (m²)" htmlFor="surface_min_m2">
            <input id="surface_min_m2" name="surface_min_m2" type="number" min="0" className="champ" />
          </Field>
          <Field label="Surface maximale du terrain (m²)" htmlFor="surface_max_m2">
            <input id="surface_max_m2" name="surface_max_m2" type="number" min="0" className="champ" />
          </Field>
        </div>
      </section>

      {/* --- Groupe professionnel (section 9) ---------------------------- */}
      <section className="surface p-6">
        <h2 className="text-lg font-bold text-encre-900">Participation avec un même corps professionnel</h2>
        <p className="mt-1 text-sm text-encre-500">
          Souhaitez-vous participer avec des personnes exerçant le même métier que vous ?
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {(Object.keys(SAME_BODY_LABELS) as SameBodyPreference[]).map((key) => (
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
              <span className="font-semibold text-encre-900">
                {key === 'oui' ? 'Oui' : key === 'non' ? 'Non' : 'Indifférent'}
              </span>
              <span className="mt-0.5 block text-xs text-encre-500">{SAME_BODY_LABELS[key]}</span>
            </label>
          ))}
        </div>

        {sameBody === 'oui' ? (
          <div className="mt-4 max-w-sm">
            <Field label="Corps professionnel recherché" htmlFor="preferred_body">
              <select id="preferred_body" name="preferred_body" className="champ" defaultValue="">
                <option value="">Choisissez un corps</option>
                {(Object.keys(PROFESSIONAL_BODY_LABELS) as ProfessionalBody[]).map((key) => (
                  <option key={key} value={key}>
                    {PROFESSIONAL_BODY_LABELS[key]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : null}
      </section>

      {/* --- Reseaux indispensables -------------------------------------- */}
      <section className="surface p-6">
        <h2 className="text-lg font-bold text-encre-900">Réseaux indispensables</h2>
        <p className="mt-1 text-sm text-encre-500">
          Un terrain qui ne dispose pas d’un réseau que vous jugez indispensable verra son score
          baisser.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Checkbox name="requires_water" value="on" label="💧 Eau potable" />
          <Checkbox name="requires_electricity" value="on" label="⚡ Électricité" />
          <Checkbox name="requires_sewage" value="on" label="🚰 Assainissement" />
        </div>
      </section>

      {/* --- Intitule et notes ------------------------------------------- */}
      <section className="surface p-6">
        <Field
          label="Intitulé de la demande"
          htmlFor="title"
          hint="Laissez vide pour un intitulé généré automatiquement."
        >
          <input
            id="title"
            name="title"
            className="champ"
            placeholder="Appartement R+4 — Casablanca — 10 unités"
          />
        </Field>
        <div className="mt-4">
          <Field label="Précisions" htmlFor="notes">
            <textarea id="notes" name="notes" rows={4} className="champ" />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" variant="collectif" disabled={busy}>
          {busy ? 'Enregistrement…' : 'Publier ma demande'}
        </Button>
        <p className="text-sm text-encre-400">
          Dès l’enregistrement, le moteur recherche les terrains déjà publiés qui vous correspondent.
        </p>
      </div>
    </form>
  )
}
