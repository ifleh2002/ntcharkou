import type { Metadata } from 'next'
import { ProjectCard } from '@/components/project-card'
import { EmptyState, LinkButton } from '@/components/ui'
import { PROPERTY_NEED_LABELS } from '@/lib/labels'
import { getRegions, listProjects } from '@/lib/queries'
import type { PropertyNeed } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Projets participatifs',
  description:
    'Rejoignez un projet participatif validé : logement collectif, lotissement, groupe professionnel.',
}

export default async function ProjetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const region = typeof params.region === 'string' ? params.region : undefined
  const need = typeof params.typologie === 'string' ? (params.typologie as PropertyNeed) : undefined
  const onlyOpen = params.ouverts === '1'

  const [regions, projects] = await Promise.all([
    getRegions(),
    listProjects({ region, need, onlyOpen, perPage: 24 }),
  ])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-encre-900">Projets participatifs validés</h1>
        <p className="mt-2 max-w-2xl text-encre-500">
          Chaque projet a été analysé puis validé par l’administration avant d’être ouvert aux
          participants. Suivez l’avancement du groupe et rejoignez celui qui vous correspond.
        </p>
      </header>

      <form method="get" className="surface mb-8 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-52 flex-1">
          <label className="etiquette" htmlFor="p-region">
            Région
          </label>
          <select id="p-region" name="region" className="champ" defaultValue={region ?? ''}>
            <option value="">Toutes les régions</option>
            {regions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name_fr}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-52 flex-1">
          <label className="etiquette" htmlFor="p-need">
            Typologie
          </label>
          <select id="p-need" name="typologie" className="champ" defaultValue={need ?? ''}>
            <option value="">Toutes les typologies</option>
            {(Object.keys(PROPERTY_NEED_LABELS) as PropertyNeed[]).map((key) => (
              <option key={key} value={key}>
                {PROPERTY_NEED_LABELS[key]}
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
          Uniquement les projets ouverts
        </label>
        <button
          type="submit"
          className="rounded-lg bg-zellige-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zellige-600"
        >
          Filtrer
        </button>
      </form>

      {projects.items.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.items.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🏗️"
          title="Aucun projet ne correspond"
          description="Aucun projet participatif validé ne correspond à ces critères pour le moment. Vous pouvez créer votre propre groupe et inviter d’autres participants."
          action={
            <LinkButton href="/mes-projets/nouveau" variant="collectif" size="sm" className="mt-2">
              Créer mon groupe
            </LinkButton>
          }
        />
      )}
    </div>
  )
}
