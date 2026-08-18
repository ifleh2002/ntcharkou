import type { Dictionary } from '@/lib/i18n'
import type { OutlineEntry } from '@/lib/seo'

/**
 * Sommaire d'un article.
 *
 * Deux usages, pas un seul. Pour le lecteur, il donne la structure avant de
 * s'engager dans un texte long. Pour un moteur de réponse, il expose des ancres
 * nommées : citer « la section sur la melkia » suppose qu'elle ait une adresse.
 *
 * Il ne s'affiche qu'à partir de trois entrées — au-dessous, il n'apprend rien
 * que le déroulé de la page ne montre déjà.
 */
export function ArticleOutline({ entries, t }: { entries: OutlineEntry[]; t: Dictionary }) {
  if (entries.length < 3) return null

  return (
    <nav
      aria-labelledby="sommaire"
      className="mt-8 rounded-xl border border-sable-300 bg-sable-100 p-4 sm:p-5"
    >
      <h2 id="sommaire" className="text-sm font-bold tracking-wide text-encre-700 uppercase">
        {t.blog.outline}
      </h2>
      <ol className="mt-3 space-y-1.5">
        {entries.map((entry) => (
          <li key={entry.id} className={entry.level === 3 ? 'ms-4' : undefined}>
            <a
              href={`#${entry.id}`}
              className="text-sm text-encre-600 underline-offset-2 hover:text-argile-600 hover:underline"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
