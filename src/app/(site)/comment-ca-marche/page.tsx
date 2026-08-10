import type { Metadata } from 'next'
import { Card, LinkButton, SectionTitle } from '@/components/ui'
import { CRITERION_LABELS } from '@/lib/labels'

export const metadata: Metadata = {
  title: 'Comment ça marche ?',
  description:
    'Du dépôt du terrain au groupe constitué : le parcours propriétaire, le parcours participant et le moteur de matching.',
}

const OWNER_STEPS = [
  'Vous décrivez votre identité et le type de propriété (particulier, société, héritiers, mandataire).',
  'Vous localisez le terrain : région, ville, quartier, adresse approximative, position GPS facultative.',
  'Vous renseignez les caractéristiques : zonage, superficie, façade, profondeur, voie, titre foncier.',
  'Vous indiquez le prix au m² — le prix total est calculé automatiquement.',
  'Vous cochez les réseaux disponibles : eau, électricité, assainissement, télécom, gaz.',
  'Vous joignez photos et documents. Les pièces sensibles restent réservées à l’administration.',
]

const PARTICIPANT_STEPS = [
  'Vous complétez votre profil : région, ville, situation professionnelle et corps professionnel.',
  'Vous sélectionnez une ou plusieurs typologies : appartement, terrain R+2 à R+4, villa, mini-ferme…',
  'Vous précisez votre budget total et votre budget par unité — c’est ce qui rend le matching pertinent.',
  'Vous indiquez le nombre d’unités souhaitées et si vous voulez rester entre gens du même métier.',
  'Le moteur vous prévient dès qu’un terrain ou un projet correspond à vos critères.',
]

const WEIGHTS: { key: string; weight: number }[] = [
  { key: 'region', weight: 20 },
  { key: 'ville', weight: 15 },
  { key: 'type', weight: 20 },
  { key: 'zonage', weight: 15 },
  { key: 'budget', weight: 15 },
  { key: 'unites', weight: 10 },
  { key: 'reseaux', weight: 5 },
]

const SCORE_SCALE = [
  { range: '90 – 100 %', label: 'Excellent match', dot: '🟢' },
  { range: '75 – 89 %', label: 'Très bon match', dot: '🟢' },
  { range: '60 – 74 %', label: 'Match intéressant', dot: '🟠' },
  { range: '< 60 %', label: 'Faible correspondance', dot: '⚪' },
]

export default function CommentCaMarchePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold text-encre-900">Comment ça marche ?</h1>
        <p className="mt-3 leading-relaxed text-encre-500">
          Ntcharkou relie quatre éléments : les terrains disponibles, les demandes des participants,
          les groupes de projet et la validation administrative. Voici le parcours complet.
        </p>
      </header>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold text-encre-900">🏞️ Vous avez un terrain</h2>
          <ol className="mt-4 space-y-3">
            {OWNER_STEPS.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm text-encre-700">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-argile-100 text-xs font-bold text-argile-700">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <LinkButton href="/mes-terrains/nouveau" size="sm" className="mt-5">
            Proposer un terrain
          </LinkButton>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-encre-900">👥 Vous cherchez un logement</h2>
          <ol className="mt-4 space-y-3">
            {PARTICIPANT_STEPS.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm text-encre-700">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-zellige-100 text-xs font-bold text-zellige-700">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <LinkButton href="/mes-demandes/nouvelle" variant="collectif" size="sm" className="mt-5">
            Déposer une demande
          </LinkButton>
        </Card>
      </section>

      {/* --- Le moteur de matching ---------------------------------------- */}
      <section className="mt-14">
        <SectionTitle
          title="Le moteur de matching"
          subtitle="Un score transparent, calculé dans les deux sens : du terrain vers les demandes, et de la demande vers les terrains."
        />

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <Card>
            <h3 className="font-semibold text-encre-900">Pondération des critères</h3>
            <ul className="mt-4 space-y-2.5">
              {WEIGHTS.map((item) => (
                <li key={item.key} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-sm text-encre-700">
                    {CRITERION_LABELS[item.key]}
                  </span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-sable-300">
                    <span
                      className="block h-full rounded-full bg-argile-400"
                      style={{ width: `${item.weight * 5}%` }}
                    />
                  </span>
                  <span className="w-12 shrink-0 text-right text-sm font-semibold text-encre-900">
                    {item.weight} %
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-encre-400">
              Cette formule est volontairement simple et lisible. Elle pourra être remplacée par un
              moteur de recommandation plus sophistiqué sans rien changer au reste de la plateforme :
              le calcul est isolé dans une seule fonction de la base de données.
            </p>
          </Card>

          <div className="space-y-4">
            <Card>
              <h3 className="font-semibold text-encre-900">Lecture du score</h3>
              <ul className="mt-3 space-y-2">
                {SCORE_SCALE.map((item) => (
                  <li key={item.range} className="flex items-center gap-2 text-sm">
                    <span aria-hidden>{item.dot}</span>
                    <span className="font-medium text-encre-900">{item.range}</span>
                    <span className="text-encre-500">— {item.label}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <h3 className="font-semibold text-encre-900">Exemple</h3>
              <p className="mt-2 text-sm text-encre-500">
                Un terrain à Casablanca de 1 500 m², zoné R+4 à 7 000 DH/m², face à une demande
                « immeuble, Casablanca, 15 à 20 unités, budget compatible ».
              </p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-sm font-semibold text-white">
                92 % — Excellent match
              </p>
              <p className="mt-3 text-sm text-encre-500">
                Le participant reçoit immédiatement une notification, et le propriétaire voit le
                nombre de demandes compatibles sur son annonce.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* --- Validation --------------------------------------------------- */}
      <section className="mt-14">
        <SectionTitle
          title="Validation administrative"
          subtitle="Rien n’est publié automatiquement : chaque terrain et chaque projet passe par un contrôle."
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <h3 className="font-semibold text-encre-900">Terrain</h3>
            <p className="mt-3 text-sm leading-relaxed text-encre-700">
              Brouillon → Soumis → En vérification → Validé → <strong>Publié</strong>
              <br />
              <span className="text-encre-400">(ou Refusé, avec motif communiqué au propriétaire)</span>
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold text-encre-900">Projet participatif</h3>
            <p className="mt-3 text-sm leading-relaxed text-encre-700">
              Proposition → Analyse → Validation administrative → Ouvert aux participants → Groupe
              constitué → Projet en préparation → <strong>Projet réalisé</strong>
            </p>
          </Card>
        </div>
      </section>

      <section className="mt-14">
        <Card className="bg-zellige-500 text-white">
          <h2 className="text-xl font-bold">Vos données personnelles restent privées</h2>
          <p className="mt-2 max-w-3xl leading-relaxed text-zellige-50/90">
            Téléphone, email, CIN, titre foncier, note de renseignement urbanistique : aucune de ces
            informations n’apparaît sur les pages publiques. Elles ne sont accessibles qu’à vous et à
            l’administration, et cette restriction est appliquée directement par la base de données.
          </p>
        </Card>
      </section>
    </div>
  )
}
