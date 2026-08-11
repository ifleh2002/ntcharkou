import Link from 'next/link'
import { getTranslation } from '@/lib/i18n/server'

export async function SiteFooter() {
  const { t, path } = await getTranslation()

  const columns = [
    {
      title: t.footer.discover,
      links: [
        { href: '/terrains', label: t.footer.availableLands },
        { href: '/projets', label: t.footer.participatoryProjects },
        { href: '/comment-ca-marche', label: t.nav.howItWorks },
      ],
    },
    {
      title: t.footer.participate,
      links: [
        { href: '/mes-terrains/nouveau', label: t.footer.proposeLand },
        { href: '/mes-demandes/nouvelle', label: t.footer.postRequest },
        { href: '/projets', label: t.footer.createGroup },
      ],
    },
    {
      title: t.footer.platform,
      links: [
        { href: '/a-propos', label: t.footer.about },
        { href: '/faq', label: t.nav.faq },
        { href: '/contact', label: t.nav.contact },
      ],
    },
  ]

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
          <p className="mt-3 text-sm leading-relaxed text-encre-500">{t.footer.tagline}</p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-semibold text-encre-900">{column.title}</h3>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={path(link.href)}
                    className="text-sm text-encre-500 hover:text-argile-600"
                  >
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
          <p>
            © {new Date().getFullYear()} Ntcharkou — {t.footer.rights}
          </p>
          <p>{t.footer.privacy}</p>
        </div>
      </div>
    </footer>
  )
}
