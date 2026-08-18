import type { Metadata } from 'next'
import Link from 'next/link'
import { PostCard } from '@/components/post-card'
import { EmptyState } from '@/components/ui'
import { createFormatter } from '@/lib/format'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { jsonLd, languageAlternates, siteUrl } from '@/lib/seo'
import { BLOG_CATEGORY_ORDER } from '@/lib/labels'
import { countPostsByCategory, listPosts } from '@/lib/queries'
import type { BlogCategory } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const t = getDictionary(locale)
  const canonical = siteUrl(`/${locale}/blog`)

  return {
    title: t.blog.title,
    description: t.blog.lead,
    alternates: {
      ...(canonical ? { canonical } : {}),
      languages: languageAlternates('/blog'),
    },
    openGraph: {
      type: 'website',
      title: t.blog.title,
      description: t.blog.lead,
      ...(canonical ? { url: canonical } : {}),
    },
  }
}

export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const { t, path } = translation(locale)
  const { date } = createFormatter(locale, t)

  const query = await searchParams
  const asked = typeof query.rubrique === 'string' ? query.rubrique : undefined
  // Une rubrique inconnue dans l'URL ne doit pas vider la page sans raison :
  // on ne retient que ce que le référentiel connaît.
  const category = BLOG_CATEGORY_ORDER.includes(asked as BlogCategory)
    ? (asked as BlogCategory)
    : undefined

  const [posts, counts] = await Promise.all([
    listPosts({ category }, locale),
    countPostsByCategory(),
  ])

  // On n'affiche que des rubriques qui mènent quelque part.
  const available = BLOG_CATEGORY_ORDER.filter((item) => (counts[item] ?? 0) > 0)
  const [lead, ...rest] = posts

  // Fiche du blog et liste de ses articles : un moteur comprend ainsi qu'il a
  // affaire à une collection éditoriale, et non à une page quelconque.
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: t.blog.title,
    description: t.blog.lead,
    inLanguage: locale === 'ar' ? 'ar' : 'fr',
    ...(siteUrl(`/${locale}/blog`) ? { url: siteUrl(`/${locale}/blog`) } : {}),
    blogPost: posts.slice(0, 20).map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      ...(siteUrl(`/${locale}/blog/${post.slug}`)
        ? { url: siteUrl(`/${locale}/blog/${post.slug}`) }
        : {}),
      ...(post.published_at ? { datePublished: post.published_at } : {}),
    })),
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-encre-900">{t.blog.title}</h1>
        <p className="mt-2 max-w-2xl text-encre-500">{t.blog.lead}</p>
      </header>

      {available.length > 0 ? (
        <nav className="mb-8 flex flex-wrap gap-2" aria-label={t.blog.allCategories}>
          <CategoryLink href={path('/blog')} active={!category} label={t.blog.allCategories} />
          {available.map((item) => (
            <CategoryLink
              key={item}
              href={`${path('/blog')}?rubrique=${item}`}
              active={category === item}
              label={`${t.blog.categories[item]} (${counts[item]})`}
            />
          ))}
        </nav>
      ) : null}

      {posts.length === 0 ? (
        <EmptyState
          icon="📰"
          title={category ? t.blog.emptyCategoryTitle : t.blog.emptyTitle}
          description={category ? t.blog.emptyCategoryBody : t.blog.emptyBody}
        />
      ) : (
        <>
          {/* Le plus récent occupe deux colonnes : sans hiérarchie, une liste
              d'articles se lit comme un catalogue. */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <PostCard
                post={lead}
                href={path(`/blog/${lead.slug}`)}
                t={t}
                formatDate={date}
                eager
              />
            </div>
            {rest.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                href={path(`/blog/${post.slug}`)}
                t={t}
                formatDate={date}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function CategoryLink({
  href,
  active,
  label,
}: {
  href: string
  active: boolean
  label: string
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={
        active
          ? 'rounded-full border border-argile-500 bg-argile-500 px-3.5 py-1.5 text-sm font-semibold text-white'
          : 'rounded-full border border-sable-300 bg-white px-3.5 py-1.5 text-sm font-medium text-encre-600 hover:border-argile-300 hover:text-argile-700'
      }
    >
      {label}
    </Link>
  )
}
