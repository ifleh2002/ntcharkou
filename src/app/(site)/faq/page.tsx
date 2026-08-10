import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Questions fréquentes sur le dépôt de terrain, le matching et les projets participatifs.',
}

const FAQ = [
  {
    q: 'Le dépôt d’un terrain est-il payant ?',
    a: 'Non. Le dépôt et la publication d’un terrain sont gratuits. Le terrain passe par une vérification administrative avant d’apparaître publiquement.',
  },
  {
    q: 'Combien de temps prend la validation d’un terrain ?',
    a: 'La durée dépend des pièces fournies. Un dossier complet — titre foncier, note de renseignement urbanistique, plan — est traité beaucoup plus rapidement.',
  },
  {
    q: 'Mon numéro de téléphone sera-t-il visible ?',
    a: 'Non. Aucune coordonnée personnelle n’apparaît sur les pages publiques : ni téléphone, ni email, ni CIN. La mise en relation est organisée par l’administration.',
  },
  {
    q: 'Comment le score de compatibilité est-il calculé ?',
    a: 'Sept critères pondérés : région (20 %), ville (15 %), type de projet (20 %), zonage (15 %), budget (15 %), nombre d’unités (10 %) et réseaux (5 %). Le détail du calcul est affiché pour chaque correspondance.',
  },
  {
    q: 'Que se passe-t-il quand je dépose une demande ?',
    a: 'Le moteur recherche immédiatement les terrains publiés qui correspondent, et vous prévient. Ensuite, chaque nouveau terrain publié est confronté à votre demande : vous recevez une notification dès qu’une correspondance dépasse 60 %.',
  },
  {
    q: 'Puis-je participer avec des personnes du même métier ?',
    a: 'Oui. Vous pouvez indiquer que vous souhaitez participer uniquement avec des personnes du même corps professionnel, et créer un groupe dédié — par exemple « Résidence des Médecins — Casablanca ».',
  },
  {
    q: 'Que devient ma candidature à un projet ?',
    a: 'Elle est transmise au porteur du projet, qui l’accepte ou la refuse. Vous êtes notifié de la décision. Lorsque le nombre de participants confirmés atteint la cible, le groupe est déclaré constitué.',
  },
  {
    q: 'Puis-je modifier ou retirer mon annonce ?',
    a: 'Oui, tant qu’elle n’est pas en cours de vérification. Une annonce publiée peut être archivée à tout moment depuis votre espace.',
  },
]

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-encre-900">Questions fréquentes</h1>
      <p className="mt-2 text-encre-500">
        Vous ne trouvez pas votre réponse ? Écrivez-nous depuis la page contact.
      </p>

      <div className="mt-8 space-y-3">
        {FAQ.map((item) => (
          <details key={item.q} className="surface group p-0">
            <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-encre-900 marker:hidden">
              <span className="mr-2 text-argile-500 group-open:hidden">+</span>
              <span className="mr-2 hidden text-argile-500 group-open:inline">−</span>
              {item.q}
            </summary>
            <p className="px-5 pb-4 text-sm leading-relaxed text-encre-500">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
