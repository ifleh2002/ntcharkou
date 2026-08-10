import type { Metadata } from 'next'
import { Card, LinkButton } from '@/components/ui'

export const metadata: Metadata = {
  title: 'À propos',
  description: 'La vision de Ntcharkou : une place de marché du logement participatif au Maroc.',
}

export default function AProposPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-encre-900">À propos de Ntcharkou</h1>

      <div className="mt-6 space-y-5 leading-relaxed text-encre-700">
        <p>
          <em>Ntcharkou</em> — « participons » — est une place de marché du logement participatif au
          Maroc. La plateforme met en relation quatre éléments : les terrains disponibles, les
          demandes des participants, les groupes de projet et la validation administrative.
        </p>
        <p>
          L’idée de départ est simple : un portail immobilier classique se contente d’afficher des
          annonces. Ici, la plateforme effectue automatiquement le rapprochement entre un terrain
          publié et les besoins réels exprimés par les participants — région, ville, typologie,
          zonage, budget, nombre d’unités, réseaux — puis calcule un score de compatibilité.
        </p>
        <p>
          Ce rapprochement fonctionne dans les deux sens. Lorsqu’un propriétaire publie un terrain,
          les participants dont la demande correspond sont prévenus. Lorsqu’un participant dépose une
          demande, il découvre immédiatement les terrains déjà disponibles qui lui conviennent.
        </p>
        <p>
          Enfin, un terrain peut devenir un <strong>projet participatif</strong> : un groupe se
          constitue, parfois autour d’un même corps professionnel — médecins, enseignants,
          ingénieurs — jusqu’à réunir le nombre de participants nécessaire.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { icon: '🔍', title: 'Transparence', text: 'Le score de compatibilité est détaillé critère par critère.' },
          { icon: '🛡️', title: 'Vérification', text: 'Chaque terrain est contrôlé avant publication.' },
          { icon: '🔒', title: 'Confidentialité', text: 'Les coordonnées ne sont jamais publiées.' },
        ].map((item) => (
          <Card key={item.title}>
            <span className="text-2xl" aria-hidden>
              {item.icon}
            </span>
            <h2 className="mt-2 font-semibold text-encre-900">{item.title}</h2>
            <p className="mt-1 text-sm text-encre-500">{item.text}</p>
          </Card>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <LinkButton href="/comment-ca-marche" variant="secondary">
          Comment ça marche ?
        </LinkButton>
        <LinkButton href="/inscription">Créer un compte</LinkButton>
      </div>
    </div>
  )
}
