import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminProjectForm, type ProjectableLand } from '@/components/admin-project-form'
import { requireAdmin } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: `${getDictionary(resolveLocale(locale)).adminProjects.newTitle} — Ntcharkou` }
}

export default async function AdminNouveauProjetPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const { t, path } = translation(locale)

  await requireAdmin()
  const supabase = await createSupabaseServerClient()

  // Seuls les terrains dont l'administration a vérifié le dossier sont
  // transformables : la fonction SQL applique la même règle.
  const { data } = await supabase.rpc('admin_projectable_lands')
  const lands = (data ?? []) as ProjectableLand[]

  return (
    <div className="max-w-3xl">
      <nav className="mb-5 text-sm text-white/50">
        <Link href={path('/admin/projets')} className="hover:text-white">
          {t.admin.projectsTitle}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white/80">{t.adminProjects.newTitle}</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-encre-900">{t.adminProjects.newTitle}</h1>
        <p className="mt-2 max-w-2xl text-encre-500">{t.adminProjects.newLead}</p>
      </header>

      <AdminProjectForm lands={lands} t={t} locale={locale} />
    </div>
  )
}
