'use client'

import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { saveLand } from '@/app/actions/lands'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'
import type { Formatter } from '@/lib/format'
import { ZONING_ORDER } from '@/lib/labels'
import { LAND_DOCUMENTS_BUCKET, LAND_IMAGES_BUCKET } from '@/lib/storage'
import type { City, LegalStatus, OwnerKind, Profile, Region } from '@/lib/types'
import { CityOptions } from './city-options'
import { Alert, Button, Checkbox, Field, cx } from './ui'

const DOCUMENT_KINDS = ['plan', 'titre_foncier', 'note_urbanisme', 'cadastre', 'autre'] as const

export function LandForm({
  regions,
  cities,
  profile,
  ownerKind,
  t,
  f,
  nextPath,
}: {
  regions: Region[]
  cities: City[]
  profile: Profile
  ownerKind: OwnerKind
  t: Dictionary
  f: Formatter
  /** Construit l'URL de la fiche créée, préfixe de langue compris. */
  nextPath: (landId: string) => string
}) {
  const STEPS = t.landForm.steps
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)

  const [region, setRegion] = useState('')
  const [residenceRegion, setResidenceRegion] = useState(profile.region_code ?? '')
  const [kind, setKind] = useState<OwnerKind>(ownerKind)
  const [surface, setSurface] = useState('')
  const [pricePerM2, setPricePerM2] = useState('')

  const totalPrice = useMemo(() => {
    const s = Number(surface)
    const p = Number(pricePerM2)
    if (!Number.isFinite(s) || !Number.isFinite(p) || s <= 0 || p <= 0) return null
    return s * p
  }, [surface, pricePerM2])

  const isLastStep = step === STEPS.length - 1

  function goNext() {
    // Validation native du navigateur, limitee aux champs de l'etape affichee.
    const form = formRef.current
    if (form) {
      const section = form.querySelector<HTMLElement>(`[data-step="${step}"]`)
      const invalid = section?.querySelector<HTMLInputElement | HTMLSelectElement>(':invalid')
      if (invalid) {
        invalid.reportValidity()
        return
      }
    }
    setError(null)
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget

    // Un champ obligatoire d'une etape masquee n'est pas focusable : on revient
    // sur son etape avant d'afficher le message de validation.
    if (!form.checkValidity()) {
      const invalid = form.querySelector<HTMLInputElement>(':invalid')
      const owningStep = invalid?.closest<HTMLElement>('[data-step]')?.dataset.step
      if (owningStep !== undefined) setStep(Number(owningStep))
      window.requestAnimationFrame(() => invalid?.reportValidity())
      return
    }

    setBusy(true)
    setError(null)

    const formData = new FormData(form)
    const intent = (
      (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    )?.value
    formData.set('intent', intent === 'brouillon' ? 'brouillon' : 'soumis')

    const result = await saveLand(formData)
    if (result.error || !result.landId) {
      setError(result.error ?? t.landForm.errSave)
      setBusy(false)
      return
    }

    // Les fichiers sont envoyes depuis le navigateur, directement vers Storage.
    try {
      await uploadFiles(form, result.landId)
    } catch (uploadError) {
      console.error(uploadError)
      setError(t.landForm.errUpload)
    }

    router.push(nextPath(result.landId))
  }

  async function uploadFiles(form: HTMLFormElement, landId: string) {
    const supabase = createSupabaseBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const photos = (form.querySelector('#photos') as HTMLInputElement | null)?.files
    if (photos?.length) {
      for (let index = 0; index < photos.length; index += 1) {
        const file = photos[index]
        setProgress(`${t.landForm.uploadPhotos} (${index + 1}/${photos.length})…`)
        const path = `${user.id}/${landId}/${Date.now()}-${index}-${sanitize(file.name)}`
        const { error: upErr } = await supabase.storage
          .from(LAND_IMAGES_BUCKET)
          .upload(path, file, { upsert: false })
        if (upErr) throw upErr
        await supabase.from('land_images').insert({
          land_id: landId,
          storage_path: path,
          sort_order: index,
        })
      }
    }

    for (const doc of DOCUMENT_KINDS) {
      const input = form.querySelector(`#doc-${doc}`) as HTMLInputElement | null
      const files = input?.files
      if (!files?.length) continue
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        setProgress(`${t.landForm.uploadDocuments} (${t.landForm.documents[doc]})…`)
        const path = `${user.id}/${landId}/${doc}-${Date.now()}-${sanitize(file.name)}`
        const { error: upErr } = await supabase.storage
          .from(LAND_DOCUMENTS_BUCKET)
          .upload(path, file, { upsert: false })
        if (upErr) throw upErr
        await supabase.from('land_documents').insert({
          land_id: landId,
          kind: doc,
          label: file.name,
          storage_path: path,
          uploaded_by: user.id,
        })
      }
    }

    setProgress(null)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* --- Fil d'etapes ---------------------------------------------- */}
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((item, index) => (
          <li key={item.title}>
            <button
              type="button"
              onClick={() => setStep(index)}
              className={cx(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                index === step
                  ? 'border-argile-500 bg-argile-500 text-white'
                  : index < step
                    ? 'border-argile-200 bg-argile-100 text-argile-800'
                    : 'border-sable-300 bg-white text-encre-400',
              )}
            >
              {index + 1}. {item.title}
            </button>
          </li>
        ))}
      </ol>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {progress ? <Alert tone="info">{progress}</Alert> : null}

      <div className="surface p-6">
        <h2 className="text-lg font-bold text-encre-900">
          {t.landForm.step} {step + 1} — {STEPS[step].title}
        </h2>
        <p className="mt-1 text-sm text-encre-500">{STEPS[step].hint}</p>

        <div className="mt-6">
          {/* ============ Étape 1 : informations personnelles ============ */}
          <section data-step="0" hidden={step !== 0} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.auth.firstName} htmlFor="first_name" required>
                <input
                  id="first_name"
                  name="first_name"
                  required
                  defaultValue={profile.first_name}
                  className="champ"
                />
              </Field>
              <Field label={t.auth.lastName} htmlFor="last_name" required>
                <input
                  id="last_name"
                  name="last_name"
                  required
                  defaultValue={profile.last_name}
                  className="champ"
                />
              </Field>
              <Field label={t.auth.phone} htmlFor="phone" required>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  defaultValue={profile.phone ?? ''}
                  className="champ"
                />
              </Field>
              <Field label={t.auth.email} htmlFor="contact_email" required>
                <input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  required
                  defaultValue={profile.email ?? ''}
                  className="champ"
                />
              </Field>
              <Field label={t.landForm.residenceRegion} htmlFor="residence_region">
                <select
                  id="residence_region"
                  name="residence_region"
                  className="champ"
                  value={residenceRegion}
                  onChange={(event) => setResidenceRegion(event.target.value)}
                >
                  <option value="">—</option>
                  {regions.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t.landForm.residenceCity} htmlFor="residence_city">
                <select
                  id="residence_city"
                  name="residence_city"
                  className="champ"
                  defaultValue={profile.city_id ?? ''}
                >
                  <option value="">—</option>
                  <CityOptions cities={cities} regions={regions} region={residenceRegion} />
                </select>
              </Field>
            </div>

            <Field label={t.landForm.ownerKind} htmlFor="owner_kind" required>
              <select
                id="owner_kind"
                name="owner_kind"
                required
                className="champ"
                value={kind}
                onChange={(event) => setKind(event.target.value as OwnerKind)}
              >
                {(Object.keys(t.enums.ownerKind) as OwnerKind[]).map((key) => (
                  <option key={key} value={key}>
                    {t.enums.ownerKind[key]}
                  </option>
                ))}
              </select>
            </Field>

            {kind === 'societe' ? (
              <Field label={t.landForm.companyName} htmlFor="company_name">
                <input id="company_name" name="company_name" className="champ" />
              </Field>
            ) : null}

            <Field
              label={t.landForm.cin}
              htmlFor="cin_number"
              hint={t.landForm.cinHint}
            >
              <input id="cin_number" name="cin_number" className="champ" />
            </Field>

            <Checkbox
              name="terms"
              value="1"
              required
              label={t.landForm.certify}
            />
          </section>

          {/* ============ Étape 2 : localisation ============ */}
          <section data-step="1" hidden={step !== 1} className="space-y-4">
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
                <select id="city_id" name="city_id" className="champ" defaultValue="">
                  <option value="">{t.landForm.chooseCity}</option>
                  <CityOptions cities={cities} regions={regions} region={region} />
                </select>
              </Field>
            </div>

            <Field
              label={t.landForm.otherCity}
              htmlFor="city_other"
              hint={t.landForm.otherCityHint}
            >
              <input id="city_other" name="city_other" className="champ" />
            </Field>

            <Field label={t.common.district} htmlFor="district">
              <input id="district" name="district" className="champ" />
            </Field>

            <Field
              label={t.landForm.address}
              htmlFor="address"
              hint={t.landForm.addressHint}
            >
              <input id="address" name="address" className="champ" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`${t.landForm.latitude} (${t.common.optional})`} htmlFor="latitude">
                <input
                  id="latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  className="champ"
                  placeholder="33.5731"
                />
              </Field>
              <Field label={`${t.landForm.longitude} (${t.common.optional})`} htmlFor="longitude">
                <input
                  id="longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  className="champ"
                  placeholder="-7.5898"
                />
              </Field>
            </div>
          </section>

          {/* ============ Étape 3 : caractéristiques ============ */}
          <section data-step="2" hidden={step !== 2} className="space-y-4">
            <Field
              label={t.landForm.listingTitle}
              htmlFor="title"
              hint={t.landForm.listingTitleHint}
            >
              <input
                id="title"
                name="title"
                className="champ"
                placeholder={t.landForm.listingTitlePlaceholder}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.lands.zoning} htmlFor="zoning" required>
                <select id="zoning" name="zoning" required className="champ" defaultValue="">
                  <option value="">{t.landForm.chooseZoning}</option>
                  {ZONING_ORDER.map((zoning) => (
                    <option key={zoning} value={zoning}>
                      {t.enums.zoning[zoning]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t.landForm.surface} htmlFor="surface_m2" required>
                <input
                  id="surface_m2"
                  name="surface_m2"
                  type="number"
                  min="1"
                  step="1"
                  required
                  className="champ"
                  value={surface}
                  onChange={(event) => setSurface(event.target.value)}
                />
              </Field>
              <Field label={t.landForm.facade} htmlFor="facade_m">
                <input id="facade_m" name="facade_m" type="number" step="0.01" className="champ" />
              </Field>
              <Field label={t.landForm.depth} htmlFor="depth_m">
                <input id="depth_m" name="depth_m" type="number" step="0.01" className="champ" />
              </Field>
              <Field label={t.landForm.facadeCount} htmlFor="facade_count">
                <input
                  id="facade_count"
                  name="facade_count"
                  type="number"
                  min="1"
                  max="8"
                  className="champ"
                />
              </Field>
              <Field label={t.landForm.roadWidth} htmlFor="road_width_m">
                <input
                  id="road_width_m"
                  name="road_width_m"
                  type="number"
                  step="0.01"
                  className="champ"
                />
              </Field>
              <Field label={t.landForm.landTitleRef} htmlFor="land_title_ref">
                <input id="land_title_ref" name="land_title_ref" className="champ" />
              </Field>
              <Field label={t.landForm.legalStatus} htmlFor="legal_status">
                <select id="legal_status" name="legal_status" className="champ" defaultValue="">
                  <option value="">—</option>
                  {(Object.keys(t.enums.legalStatus) as LegalStatus[]).map((key) => (
                    <option key={key} value={key}>
                      {t.enums.legalStatus[key]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field
              label={t.landForm.declaredUnits}
              htmlFor="declared_units"
              hint={t.landForm.declaredUnitsHint}
            >
              <input id="declared_units" name="declared_units" type="number" min="1" className="champ" />
            </Field>

            <Field label={t.landForm.description} htmlFor="description">
              <textarea id="description" name="description" rows={5} className="champ" />
            </Field>

            <Field label={t.landForm.observations} htmlFor="observations">
              <textarea id="observations" name="observations" rows={3} className="champ" />
            </Field>
          </section>

          {/* ============ Étape 4 : prix ============ */}
          <section data-step="3" hidden={step !== 3} className="space-y-4">
            <Field label={t.landForm.pricePerM2} htmlFor="price_per_m2">
              <input
                id="price_per_m2"
                name="price_per_m2"
                type="number"
                min="0"
                step="1"
                className="champ"
                value={pricePerM2}
                onChange={(event) => setPricePerM2(event.target.value)}
              />
            </Field>

            <div className="rounded-lg border border-argile-200 bg-argile-50 p-4">
              <p className="text-sm text-encre-500">{t.landForm.totalComputed}</p>
              <p className="mt-1 text-2xl font-bold text-argile-700">
                {totalPrice !== null ? f.dh(totalPrice) : '—'}
              </p>
              {totalPrice !== null ? (
                <p className="mt-1 text-xs text-encre-500">
                  {surface} {f.sqm} × {f.dh(Number(pricePerM2))} = {f.dh(totalPrice)}
                </p>
              ) : (
                <p className="mt-1 text-xs text-encre-400">
                  {t.landForm.totalHint}
                </p>
              )}
            </div>

            <Checkbox name="price_negotiable" value="on" label={t.landForm.negotiable} />
          </section>

          {/* ============ Étape 5 : réseaux ============ */}
          <section data-step="4" hidden={step !== 4} className="space-y-3">
            <p className="text-sm text-encre-500">
              {t.landForm.networksLead}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Checkbox name="has_water" value="on" label={`💧 ${t.enums.network.water}`} />
              <Checkbox name="has_electricity" value="on" label={`⚡ ${t.enums.network.electricity}`} />
              <Checkbox name="has_sewage" value="on" label={`🚰 ${t.enums.network.sewage}`} />
              <Checkbox name="has_telecom" value="on" label={`📶 ${t.enums.network.telecom}`} />
              <Checkbox name="has_gas" value="on" label={`🔥 ${t.enums.network.gas}`} />
            </div>
            <Field label={t.landForm.otherNetwork} htmlFor="network_other">
              <input id="network_other" name="network_other" className="champ" />
            </Field>
          </section>

          {/* ============ Étape 6 : documents et photos ============ */}
          <section data-step="5" hidden={step !== 5} className="space-y-5">
            <Field
              label={t.landForm.photos}
              htmlFor="photos"
              hint={t.landForm.photosHint}
            >
              <input
                id="photos"
                type="file"
                accept="image/*"
                multiple
                className="champ file:me-3 file:rounded-md file:border-0 file:bg-argile-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-argile-800"
              />
            </Field>

            <div className="rounded-lg border border-sable-300 bg-sable-100 p-4">
              <p className="text-sm font-semibold text-encre-900">
                🔒 {t.landForm.documentsTitle}
              </p>
              <p className="mt-1 text-xs text-encre-500">
                {t.landForm.documentsHint}
              </p>
              <div className="mt-4 space-y-3">
                {DOCUMENT_KINDS.map((doc) => (
                  <Field key={doc} label={t.landForm.documents[doc]} htmlFor={`doc-${doc}`}>
                    <input
                      id={`doc-${doc}`}
                      type="file"
                      accept="application/pdf,image/*"
                      multiple
                      className="champ file:me-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-encre-700"
                    />
                  </Field>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* --- Navigation ------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-3">
        {step > 0 ? (
          <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
            ← {t.common.previous}
          </Button>
        ) : null}

        {!isLastStep ? (
          <Button type="button" onClick={goNext}>
            {t.common.next} →
          </Button>
        ) : (
          <>
            <Button type="submit" name="intent" value="soumis" size="lg" disabled={busy}>
              {busy ? t.common.saving : t.landForm.submitReview}
            </Button>
            <Button type="submit" name="intent" value="brouillon" variant="secondary" disabled={busy}>
              {t.landForm.saveDraft}
            </Button>
          </>
        )}

        <p className="ms-auto text-sm text-encre-400">
          {t.landForm.step} {step + 1} {t.landForm.stepOf} {STEPS.length}
        </p>
      </div>
    </form>
  )
}

function sanitize(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .slice(-80)
}
