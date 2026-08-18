import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { countPostView } from '@/app/actions/blog'
import { Cover } from '@/components/cover'
import { PostCard } from '@/components/post-card'
import { Badge } from '@/components/ui'
import { createFormatter } from '@/lib/format'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { BLOG_CATEGORY_TONE } from '@/lib/labels'
import { excerptFrom, renderMarkdown } from '@/lib/markdown'
import { getPost, listRelatedPosts } from '@/lib/queries'
import { postImageUrl } from '@/lib/storage'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale: raw, slug } = await params
  const locale = resolveLocale(raw)
  const post = await getPost(slug, locale)
  if (!post) return {}

  const description = post.excerpt?.trim() || excerptFrom(post.body)
  const image = postImageUrl(post.cover_image_path)

  return {
    title: post.title,
    description,
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      publishedTime: post.published_at ?? undefined,
      ...(image ? { images: [image] } : {}),
    },
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: raw, slug } = await params
  const locale = resolveLocale(raw)
  const { t, path } = translation(locale)
  const { date } = createFormatter(locale, t)

  const post = await getPost(slug, locale)
  if (!post) notFound()

  const related = await listRelatedPosts(post, locale)

  // Compteur de lectures. L'appel avale ses erreurs : un compteur qui échoue ne
  // doit pas empêcher de lire l'article.
  await countPostView(post.slug)

  const cover = postImageUrl(post.cover_image_path)
  const summary = post.excerpt?.trim() || excerptFrom(post.body)

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="mb-6 text-sm">
        <Link href={path('/blog')} className="font-semibold text-argile-600 hover:underline">
          {t.blog.backToList}
        </Link>
      </p>

      <article>
        <header>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone={BLOG_CATEGORY_TONE[post.category]}>
              {t.blog.categories[post.category]}
            </Badge>
            {post.reading_minutes ? (
              <span className="text-sm text-encre-400">
                {post.reading_minutes} {t.blog.readingTime}
              </span>
            ) : null}
          </div>

          <h1 className="text-3xl font-bold leading-tight text-encre-900 sm:text-4xl">
            {post.title}
          </h1>

          {summary ? <p className="mt-4 text-lg text-encre-500">{summary}</p> : null}

          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-encre-400">
            <time dateTime={post.published_at ?? undefined}>
              {t.blog.published} {date(post.published_at ?? post.created_at)}
            </time>
            {post.author_name?.trim() ? (
              <span>
                {t.blog.by} {post.author_name}
              </span>
            ) : null}
          </p>
        </header>

        {cover ? (
          <div className="mt-6 aspect-[16/9] overflow-hidden rounded-xl bg-sable-200">
            <Cover src={cover} alt={post.title} seed={post.slug} icon="📰" eager />
          </div>
        ) : null}

        {/* Le HTML provient de notre propre rendu Markdown : tout est échappé
            avant reconstruction, aucune balise saisie ne traverse
            (`src/lib/markdown.ts`). */}
        <div
          className="article mt-8"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }}
        />

        <p className="mt-10 rounded-lg border border-sable-300 bg-sable-100 p-4 text-sm text-encre-500">
          {t.blog.disclaimer}
        </p>
      </article>

      {related.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-encre-900">{t.blog.related}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {related.map((item) => (
              <PostCard
                key={item.id}
                post={item}
                href={path(`/blog/${item.slug}`)}
                t={t}
                formatDate={date}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
