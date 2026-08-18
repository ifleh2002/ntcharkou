import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PostForm } from '@/components/post-form'
import { Badge } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { createFormatter } from '@/lib/format'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { getPostById } from '@/lib/queries'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: `${getDictionary(resolveLocale(locale)).adminBlog.edit} — Ntcharkou` }
}

export default async function ModifierArticlePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale: raw, id } = await params
  const locale = resolveLocale(raw)
  const { t, path } = translation(locale)
  const { date } = createFormatter(locale, t)

  await requireAdmin()

  const post = await getPostById(id)
  if (!post) notFound()

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <p className="mb-2 text-sm">
          <Link href={path('/admin/blog')} className="font-semibold text-argile-600 hover:underline">
            ← {t.adminBlog.title}
          </Link>
        </p>
        <h1 className="text-2xl font-bold text-encre-900">{t.adminBlog.edit}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-encre-500">
          <Badge tone={post.status === 'publie' ? 'succes' : 'neutre'}>
            {post.status === 'publie' ? t.adminBlog.statusPublished : t.adminBlog.statusDraft}
          </Badge>
          {post.published_at ? (
            <span>
              {t.blog.published} {date(post.published_at)}
            </span>
          ) : null}
          {/* La durée de lecture est calculée à l'enregistrement : l'afficher
              évite de croire qu'il s'agit d'un champ à remplir. */}
          {post.reading_minutes ? (
            <span>
              {t.adminBlog.readingEstimate} : {post.reading_minutes} {t.blog.readingTime}
            </span>
          ) : null}
          <span>
            {post.view_count} {t.blog.views}
          </span>
          {post.status === 'publie' ? (
            <Link
              href={path(`/blog/${post.slug}`)}
              className="font-semibold text-argile-600 hover:underline"
            >
              {t.adminBlog.view}
            </Link>
          ) : null}
        </div>
      </header>

      <PostForm post={post} t={t} locale={locale} />
    </div>
  )
}
