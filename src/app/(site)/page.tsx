import Link from 'next/link'
import { LandCard } from '@/components/land-card'
import { ProjectCard } from '@/components/project-card'
import { SearchBar } from '@/components/search-bar'
import { Card, LinkButton, SectionTitle } from '@/components/ui'
import { getPublicStats, getRegions, listProjects, searchLands } from '@/lib/queries'
import { formatNumber } from '@/lib/format'

const STEPS = [
  {
    icon: '📝',
    title: 'Vous déposez',
    text: 'Un propriétaire décrit son terrain, un participant décrit son besoin et son budget.',
  },
  {
    icon: '🛡️',
    title: 'Nous vérifions',
    text: "Chaque terrain passe par une vérification administrative avant d'être publié.",
  },
  {
    icon: '🎯',
    title: 'Le moteur rapproche',
    text: 'Région, ville, typologie, zonage, budget, unités et réseaux : un score de compatibilité est calculé.',
  },
  {
    icon: '🏢',
    title: 'Le groupe se constitue',
    text: 'Les participants compatibles rejoignent un projet participatif jusqu’à ce que le groupe soit complet.',
  },
]

export default async function HomePage() {
  const [stats, regions, lands, projects] = await Promise.all([
    getPublicStats(),
    getRegions(),
    searchLands({ perPage: 6 }),
    listProjects({ perPage: 3, onlyOpen: true }),
  ])

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Bandeau d'accueil (section 23)                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="motif-zellige border-b border-sable-300 bg-sable-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold tracking-wide text-argile-600 uppercase">
              Logement participatif au Maroc
            </p>
            <h1 className="mt-3 text-4xl leading-tight font-bold text-encre-900 sm:text-5xl">
              Construisons ensemble les logements de demain.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-encre-500">
              Ntcharkou ne se contente pas d’afficher des annonces. La plateforme rapproche
              automatiquement les terrains disponibles des besoins réels des participants, puis
              accompagne la formation des groupes de projet.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/mes-terrains/nouveau" size="lg">
                Je propose un terrain
              </LinkButton>
              <LinkButton href="/mes-demandes/nouvelle" size="lg" variant="collectif">
                Je cherche un projet
              </LinkButton>
              <LinkButton href="/projets" size="lg" variant="secondary">
                Découvrir les projets
              </LinkButton>
            </div>
          </div>

          <div className="mt-10 max-w-4xl">
            <SearchBar regions={regions} />
          </div>

          <dl className="mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Terrains publiés', value: formatNumber(stats.lands) },
              { label: 'Projets participatifs', value: formatNumber(stats.projects) },
              { label: 'Logements potentiels', value: formatNumber(stats.units) },
              { label: 'Régions couvertes', value: formatNumber(stats.regions) },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-xs font-semibold tracking-wide text-encre-400 uppercase">
                  {item.label}
                </dt>
                <dd className="mt-1 text-2xl font-bold text-encre-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Comment ca marche                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <SectionTitle
          title="Comment ça marche ?"
          subtitle="Quatre étapes, de la mise en ligne du terrain jusqu’au groupe constitué."
          action={
            <LinkButton href="/comment-ca-marche" variant="ghost" size="sm">
              En savoir plus →
            </LinkButton>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <Card key={step.title}>
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>
                  {step.icon}
                </span>
                <span className="grid size-6 place-items-center rounded-full bg-argile-100 text-xs font-bold text-argile-700">
                  {index + 1}
                </span>
              </div>
              <h3 className="mt-3 font-semibold text-encre-900">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-encre-500">{step.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Terrains recents                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 py-6">
        <SectionTitle
          title="Terrains disponibles"
          subtitle={
            lands.total > 0
              ? `${formatNumber(lands.total)} terrains validés et publiés.`
              : 'Les terrains apparaissent ici dès leur validation administrative.'
          }
          action={
            <LinkButton href="/terrains" variant="secondary" size="sm">
              Tout voir
            </LinkButton>
          }
        />
        {lands.items.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {lands.items.map((land) => (
              <LandCard key={land.id} land={land} />
            ))}
          </div>
        ) : (
          <Card className="text-center text-sm text-encre-500">
            Aucun terrain publié pour le moment.{' '}
            <Link href="/mes-terrains/nouveau" className="font-semibold text-argile-600">
              Proposez le premier
            </Link>
            .
          </Card>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Projets participatifs                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <SectionTitle
          title="Projets participatifs ouverts"
          subtitle="Rejoignez un groupe déjà constitué ou créez le vôtre."
          action={
            <LinkButton href="/projets" variant="secondary" size="sm">
              Tout voir
            </LinkButton>
          }
        />
        {projects.items.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.items.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <Card className="text-center text-sm text-encre-500">
            Aucun projet ouvert pour l’instant.{' '}
            <Link href="/mes-projets/nouveau" className="font-semibold text-zellige-600">
              Créez votre groupe
            </Link>
            .
          </Card>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Groupes professionnels (section 9 / 26)                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="surface overflow-hidden bg-zellige-500 p-0 text-white">
          <div className="grid gap-6 p-8 sm:p-10 lg:grid-cols-[3fr_2fr]">
            <div>
              <h2 className="text-2xl font-bold">Créez votre groupe professionnel</h2>
              <p className="mt-3 leading-relaxed text-zellige-50/90">
                Médecins, enseignants, ingénieurs, fonctionnaires : réunissez des personnes du même
                corps professionnel autour d’un même projet. Vous indiquez la ville, la typologie, le
                nombre de logements et le budget — les autres membres demandent à vous rejoindre.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <LinkButton href="/mes-projets/nouveau" variant="secondary" size="md">
                  Créer mon groupe
                </LinkButton>
                <LinkButton
                  href="/projets"
                  variant="ghost"
                  size="md"
                  className="text-white hover:bg-white/10"
                >
                  Voir les groupes existants
                </LinkButton>
              </div>
            </div>
            <div className="rounded-xl bg-white/10 p-5">
              <p className="text-sm font-semibold tracking-wide uppercase opacity-80">Exemple</p>
              <p className="mt-2 text-lg font-bold">Résidence des Médecins — Casablanca</p>
              <ul className="mt-3 space-y-1 text-sm opacity-90">
                <li>Terrain : 2 000 m²</li>
                <li>Type : R+4</li>
                <li>Unités prévues : 20</li>
                <li>Participants confirmés : 14 / 20</li>
              </ul>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/25">
                <div className="h-full w-[70%] rounded-full bg-white" />
              </div>
              <p className="mt-1.5 text-xs opacity-80">70 % du groupe constitué</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
