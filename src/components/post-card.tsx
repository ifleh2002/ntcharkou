import Link from 'next/link'
import { Cover } from './cover'
import { Badge } from './ui'
import type { Dictionary } from '@/lib/i18n'
import { BLOG_CATEGORY_TONE } from '@/lib/labels'
import { excerptFrom } from '@/lib/markdown'
import { postImageUrl } from '@/lib/storage'
import type { BlogPost } from '@/lib/types'

/**
 * Article dans une liste.
 *
 * Le chapô est facultatif à la rédaction : quand il manque, on prend le début de
 * l'article plutôt que de laisser un blanc. Une carte sans texte ne donne
 * aucune raison de cliquer.
 */
export function PostCard({
  post,
  href,
  t,
  formatDate,
  eager = false,
}: {
  post: BlogPost
  href: string
  t: Dictionary
  formatDate: (value: string | null | undefined) => string
  eager?: boolean
}) {
  const summary = post.excerpt?.trim() || excerptFrom(post.body)

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-sable-300 bg-white transition-shadow hover:shadow-md">
      <Link href={href} className="block aspect-[16/9] overflow-hidden bg-sable-200">
        <Cover
          src={postImageUrl(post.cover_image_path)}
          alt={post.title}
          seed={post.slug}
          icon="📰"
          eager={eager}
          className="transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone={BLOG_CATEGORY_TONE[post.category]}>{t.blog.categories[post.category]}</Badge>
          {post.reading_minutes ? (
            <span className="text-xs text-encre-400">
              {post.reading_minutes} {t.blog.readingTime}
            </span>
          ) : null}
        </div>

        <h2 className="text-lg font-bold leading-snug text-encre-900">
          <Link href={href} className="hover:text-argile-600">
            {post.title}
          </Link>
        </h2>

        {summary ? <p className="mt-2 line-clamp-3 text-sm text-encre-500">{summary}</p> : null}

        <div className="mt-auto flex items-center justify-between pt-4 text-xs text-encre-400">
          <time dateTime={post.published_at ?? undefined}>
            {formatDate(post.published_at ?? post.created_at)}
          </time>
          <Link href={href} className="font-semibold text-argile-600 hover:underline">
            {t.blog.readMore}
          </Link>
        </div>
      </div>
    </article>
  )
}
