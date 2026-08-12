'use client'

import { useState } from 'react'
import { setProjectTexts } from '@/app/actions/admin'
import type { Dictionary } from '@/lib/i18n'
import type { ProjectPublic } from '@/lib/types'
import { Alert, Button } from './ui'

/**
 * Textes d'un projet, dans les deux langues.
 *
 * Nécessaire pour les projets déjà créés : sans cet écran, un projet enregistré
 * avant l'ajout des champs arabes n'aurait aucun moyen d'en recevoir, et
 * resterait en français sur la version arabe du site.
 *
 * Replié par défaut, comme la grille tarifaire : la liste des projets doit
 * rester lisible.
 */
export function AdminTextsForm({ project, t }: { project: ProjectPublic; t: Dictionary }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setDone(false)

    const result = await setProjectTexts(new FormData(event.currentTarget))
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setDone(true)
  }

  if (!open) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <span className={project.title_ar ? 'text-zellige-600' : 'text-encre-400'}>
          {project.title_ar ? `🇲🇦 ${t.adminProjects.arabicPresent}` : t.adminProjects.arabicMissing}
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-semibold text-argile-600 hover:underline"
        >
          {t.adminProjects.editTexts}
        </button>
      </div>
    )
  }

  const rows: {
    name: string
    label: string
    labelAr: string
    value: string
    valueAr: string
    lines?: number
  }[] = [
    {
      name: 'title',
      label: t.adminProjects.projectTitle,
      labelAr: t.adminProjects.projectTitleAr,
      value: project.title,
      valueAr: project.title_ar ?? '',
    },
    {
      name: 'summary',
      label: t.adminProjects.summary,
      labelAr: t.adminProjects.summaryAr,
      value: project.summary ?? '',
      valueAr: project.summary_ar ?? '',
    },
    {
      name: 'description',
      label: t.adminProjects.description,
      labelAr: t.adminProjects.descriptionAr,
      value: project.description ?? '',
      valueAr: project.description_ar ?? '',
      lines: 3,
    },
  ]

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
          <Alert tone="succes">{t.adminProjects.textsSaved}</Alert>
        </div>
      ) : null}

      <p className="mb-3 text-xs text-encre-400">{t.landForm.arabicHint}</p>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.name} className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="etiquette">{row.label}</span>
              {row.lines ? (
                <textarea
                  name={row.name}
                  rows={row.lines}
                  defaultValue={row.value}
                  className="champ"
                />
              ) : (
                <input name={row.name} defaultValue={row.value} className="champ" />
              )}
            </label>

            {/* Saisie arabe explicitement en RTL, quelle que soit la langue du
                back-office au moment de la saisie. */}
            <label className="block">
              <span className="etiquette">{row.labelAr}</span>
              {row.lines ? (
                <textarea
                  name={`${row.name}_ar`}
                  rows={row.lines}
                  dir="rtl"
                  lang="ar"
                  defaultValue={row.valueAr}
                  className="champ"
                />
              ) : (
                <input
                  name={`${row.name}_ar`}
                  dir="rtl"
                  lang="ar"
                  defaultValue={row.valueAr}
                  className="champ"
                />
              )}
            </label>
          </div>
        ))}
      </div>

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
