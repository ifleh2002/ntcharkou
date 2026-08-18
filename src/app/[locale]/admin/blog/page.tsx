import type { Metadata } from 'next'
import Link from 'next/link'
import { deletePost } from '@/app/actions/blog'
import { Alert, Badge, Card, EmptyState, LinkButton } from '@/components/ui'
import { DeletePostButton } from '@/components/delete-post-button'
import { SchemaGapAlert } from '@/components/schema-gap-alert'
import { requireAdmin } from '@/lib/auth'
import { createFormatter } from '@/lib/format'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { BLOG_CATEGORY_TONE } from '@/lib/labels'
import { excerptFrom } from '@/lib/markdown'
import { listAllPosts } from '@/lib/queries'
import { findSchemaGaps } from '@/lib/schema-check'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: `${getDictionary(resolveLocale(locale)).adminBlog.title} — Ntcharkou` }
}

export default async function AdminBlogPage({
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

  await requireAdmin()
  // Sans ce contrôle, une migration non appliquée se lit « aucun article » :
  // la liste est vide dans les deux cas, mais l'une se corrige et l'autre non.
  const [posts, gaps] = await Promise.all([listAllPosts(), findSchemaGaps()])

  const query = await searchParams
  const error = typeof query.erreur === 'string' ? query.erreur : null
  const deleted = query.supprime === '1'

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-encre-900">{t.adminBlog.title}</h1>
          <p className="mt-1 text-sm text-encre-500">{t.adminBlog.lead}</p>
        </div>
        <LinkButton href={path('/admin/blog/nouveau')} size="sm">
          {t.adminBlog.create}
        </LinkButton>
      </header>

      <SchemaGapAlert gaps={gaps} t={t} />

      {/* Une suppression qui échoue ne doit pas ressembler à une suppression
          réussie : l'écran se recharge à l'identique dans les deux cas. */}
      {error ? (
        <div className="mb-4">
          <Alert tone="danger">
            <span className="whitespace-pre-line">{error}</span>
          </Alert>
        </div>
      ) : null}
      {deleted ? (
        <div className="mb-4">
          <Alert tone="succes">{t.adminBlog.deleted}</Alert>
        </div>
      ) : null}

      {posts.length === 0 ? (
        <EmptyState icon="📰" title={t.adminBlog.emptyTitle} description={t.adminBlog.emptyBody} />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const summary = post.excerpt?.trim() || excerptFrom(post.body, 140)
            return (
              <Card key={post.id} className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Badge tone={BLOG_CATEGORY_TONE[post.category]}>
                      {t.blog.categories[post.category]}
                    </Badge>
                    <Badge tone={post.status === 'publie' ? 'succes' : 'neutre'}>
                      {post.status === 'publie'
                        ? t.adminBlog.statusPublished
                        : t.adminBlog.statusDraft}
                    </Badge>
                    {/* Signale qu'un article n'a pas encore sa version arabe :
                        sans traduction, la version arabe du site affiche du
                        français. */}
                    {post.title_ar?.trim() ? (
                      <span className="text-xs text-zellige-600">🇲🇦</span>
                    ) : (
                      <span className="text-xs text-encre-400">{t.adminProjects.arabicMissing}</span>
                    )}
                  </div>

                  <h2 className="font-semibold text-encre-900">{post.title}</h2>
                  {summary ? (
                    <p className="mt-1 line-clamp-2 text-sm text-encre-500">{summary}</p>
                  ) : null}

                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-encre-400">
                    <span className="ltr-inline">/{post.slug}</span>
                    <span>{date(post.published_at ?? post.created_at)}</span>
                    {post.reading_minutes ? (
                      <span>
                        {post.reading_minutes} {t.blog.readingTime}
                      </span>
                    ) : null}
                    <span>
                      {post.view_count} {t.blog.views}
                    </span>
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <LinkButton href={path(`/admin/blog/${post.id}`)} variant="secondary" size="sm">
                    {t.common.edit}
                  </LinkButton>
                  {post.status === 'publie' ? (
                    <Link
                      href={path(`/blog/${post.slug}`)}
                      className="text-sm font-semibold text-argile-600 hover:underline"
                    >
                      {t.adminBlog.view}
                    </Link>
                  ) : null}
                  <form action={deletePost}>
                    <input type="hidden" name="post_id" value={post.id} />
                    <DeletePostButton label={t.common.delete} confirm={t.adminBlog.confirmDelete} />
                  </form>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
