import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { countPostView } from '@/app/actions/blog'
import { ArticleOutline } from '@/components/article-outline'
import { Cover } from '@/components/cover'
import { PostCard } from '@/components/post-card'
import { Badge } from '@/components/ui'
import { createFormatter } from '@/lib/format'
import { LOCALE_META } from '@/lib/i18n/config'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { BLOG_CATEGORY_TONE } from '@/lib/labels'
import { excerptFrom, renderMarkdown } from '@/lib/markdown'
import { getPost, listRelatedPosts } from '@/lib/queries'
import {
  articleSchema,
  extractFaq,
  jsonLd,
  languageAlternates,
  metaDescription,
  outline,
  siteUrl,
  wordCount,
} from '@/lib/seo'
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

  // Le titre de recherche, quand il existe, l'emporte : il s'adresse à
  // quelqu'un qui hésite entre dix liens, pas au lecteur déjà arrivé.
  const title = post.seo_title?.trim() || post.title
  const description = metaDescription(
    post.seo_description?.trim() || post.excerpt?.trim() || excerptFrom(post.body),
  )
  const image = postImageUrl(post.cover_image_path)
  const canonical = siteUrl(`/${locale}/blog/${post.slug}`)

  return {
    title,
    description,
    alternates: {
      // Sans canonique, la même page servie sous plusieurs adresses se fait
      // concurrence à elle-même dans l'index.
      ...(canonical ? { canonical } : {}),
      languages: languageAlternates(`/blog/${post.slug}`),
    },
    openGraph: {
      type: 'article',
      title,
      description,
      locale: LOCALE_META[locale].htmlLang,
      ...(canonical ? { url: canonical } : {}),
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at ?? post.published_at ?? undefined,
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
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

  // Sommaire et questions fréquentes sont déduits du corps : ce qui est décrit
  // aux moteurs est exactement ce que la page contient, sans double saisie.
  const entries = outline(post.body)
  const faq = extractFaq(post.body)

  const canonical = siteUrl(`/${locale}/blog/${post.slug}`)
  const schema = articleSchema({
    title: post.title,
    description: post.seo_description?.trim() || summary,
    url: canonical,
    imageUrl: cover,
    publishedAt: post.published_at,
    updatedAt: post.updated_at,
    authorName: post.author_name?.trim() || null,
    locale: LOCALE_META[locale].htmlLang,
    section: t.blog.categories[post.category],
    wordCount: wordCount(post.body),
    faq,
    breadcrumb: [
      { name: t.nav.blog, url: siteUrl(`/${locale}/blog`) },
      { name: t.blog.categories[post.category], url: siteUrl(`/${locale}/blog?rubrique=${post.category}`) },
      { name: post.title, url: canonical },
    ],
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Données structurées : la fiche d'article, le fil d'Ariane et les
          questions fréquentes, dans un seul graphe. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />

      {/* Fil d'Ariane visible : il double le balisage, et sert au lecteur. */}
      <nav aria-label={t.blog.breadcrumb} className="mb-6 text-sm text-encre-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href={path('/blog')} className="font-semibold text-argile-600 hover:underline">
              {t.nav.blog}
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link
              href={`${path('/blog')}?rubrique=${post.category}`}
              className="hover:text-argile-600"
            >
              {t.blog.categories[post.category]}
            </Link>
          </li>
        </ol>
      </nav>

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

          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-encre-400">
            <time dateTime={post.published_at ?? undefined}>
              {t.blog.published} {date(post.published_at ?? post.created_at)}
            </time>
            {/* Une révision affichée n'est pas un détail : c'est ce qui
                distingue un article tenu à jour d'un article abandonné. */}
            {post.updated_at && post.published_at && post.updated_at > post.published_at ? (
              <time dateTime={post.updated_at}>
                · {t.blog.updated} {date(post.updated_at)}
              </time>
            ) : null}
            {post.author_name?.trim() ? (
              <span>
                {t.blog.by} {post.author_name}
              </span>
            ) : null}
          </p>
        </header>

        {/* Réponse courte, avant tout le reste : c'est le passage qu'un moteur
            de réponse reprend, et celui qui suffit au lecteur pressé. */}
        {summary ? (
          <div className="mt-6 rounded-xl border-s-4 border-argile-400 bg-argile-50 p-4 sm:p-5">
            <p className="text-xs font-bold tracking-wide text-argile-700 uppercase">
              {t.blog.inShort}
            </p>
            <p className="mt-1.5 text-lg leading-relaxed text-encre-700">{summary}</p>
          </div>
        ) : null}

        {cover ? (
          <div className="mt-6 aspect-[16/9] overflow-hidden rounded-xl bg-sable-200">
            <Cover src={cover} alt={post.title} seed={post.slug} icon="📰" eager />
          </div>
        ) : null}

        <ArticleOutline entries={entries} t={t} />

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
