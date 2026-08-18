import type { Metadata } from 'next'
import Link from 'next/link'
import { PostForm } from '@/components/post-form'
import { requireAdmin } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: `${getDictionary(resolveLocale(locale)).adminBlog.create} — Ntcharkou` }
}

export default async function NouvelArticlePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const { t, path } = translation(locale)

  await requireAdmin()

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <p className="mb-2 text-sm">
          <Link href={path('/admin/blog')} className="font-semibold text-argile-600 hover:underline">
            ← {t.adminBlog.title}
          </Link>
        </p>
        <h1 className="text-2xl font-bold text-encre-900">{t.adminBlog.create}</h1>
      </header>

      <PostForm t={t} locale={locale} />
    </div>
  )
}
