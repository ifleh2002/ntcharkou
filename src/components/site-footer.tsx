import Link from 'next/link'

const COLUMNS = [
  {
    title: 'Découvrir',
    links: [
      { href: '/terrains', label: 'Terrains disponibles' },
      { href: '/projets', label: 'Projets participatifs' },
      { href: '/comment-ca-marche', label: 'Comment ça marche ?' },
    ],
  },
  {
    title: 'Participer',
    links: [
      { href: '/mes-terrains/nouveau', label: 'Proposer un terrain' },
      { href: '/mes-demandes/nouvelle', label: 'Déposer une demande' },
      { href: '/mes-projets/nouveau', label: 'Créer mon groupe' },
    ],
  },
  {
    title: 'La plateforme',
    links: [
      { href: '/a-propos', label: 'À propos' },
      { href: '/faq', label: 'FAQ' },
      { href: '/contact', label: 'Contact' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-sable-300 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-argile-500 text-lg font-bold text-white">
              N
            </span>
            <span className="text-lg font-bold text-encre-900">Ntcharkou</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-encre-500">
            La place de marché du logement participatif au Maroc. Nous mettons en relation les
            terrains disponibles et les besoins des participants, puis nous accompagnons la
            constitution des groupes de projet.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-semibold text-encre-900">{column.title}</h3>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-encre-500 hover:text-argile-600">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-sable-200">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-encre-400">
          <p>© {new Date().getFullYear()} Ntcharkou — Tous droits réservés.</p>
          <p>
            Les coordonnées des propriétaires et des participants ne sont jamais publiées sur la
            plateforme.
          </p>
        </div>
      </div>
    </footer>
  )
}
