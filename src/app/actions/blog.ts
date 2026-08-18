'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getActionTranslation } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { BlogCategory, BlogStatus } from '@/lib/types'

/**
 * Rédaction des articles, depuis le back-office.
 *
 * L'écriture passe par `admin_save_post` / `admin_delete_post` plutôt que par un
 * `insert` direct : la fonction revérifie le rôle de son côté et garantit
 * l'unicité du slug. Deux articles au même slug se masqueraient l'un l'autre
 * sans qu'aucune erreur ne le signale.
 */

async function adminClient() {
  const { path } = await getActionTranslation()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(path('/connexion?suivant=/admin/blog'))
  return { supabase, path }
}

/**
 * Traduit l'erreur d'un appel RPC en message exploitable.
 *
 * Mêmes causes qu'ailleurs : la fonction n'existe pas encore, ou le cache de
 * schéma de PostgREST est périmé. Le message brut ne distingue pas les deux, et
 * elles ne se corrigent pas de la même façon.
 */
function explain(error: { code?: string; message: string }): string {
  if (error.code === 'PGRST202' || /schema cache/i.test(error.message)) {
    return (
      `${error.message}\n\n` +
      'Deux causes possibles : une migration du blog ' +
      '(20260811160000_blog.sql, puis 20260811170000_blog_seo.sql) n’a pas été ' +
      'appliquée, ou le cache de schéma de PostgREST est périmé. Appliquez les ' +
      'migrations manquantes, puis exécutez dans l’éditeur SQL Supabase : ' +
      'notify pgrst, \'reload schema\';'
    )
  }
  return error.message
}

export async function savePost(
  formData: FormData,
): Promise<{ error?: string; postId?: string; slug?: string }> {
  const { supabase, path } = await adminClient()
  const { t } = await getActionTranslation()

  const text = (key: string) => ((formData.get(key) as string) || '').trim() || null

  const title = ((formData.get('title') as string) || '').trim()
  if (!title) return { error: t.adminBlog.errTitle }

  const body = ((formData.get('body') as string) || '').trim()
  if (!body) return { error: t.adminBlog.errBody }

  const postId = ((formData.get('post_id') as string) || '').trim() || null
  const status = (formData.get('status') === 'publie' ? 'publie' : 'brouillon') satisfies BlogStatus

  const { data, error } = await supabase.rpc('admin_save_post', {
    p_id: postId,
    p_slug: text('slug'),
    p_title: title,
    p_body: body,
    p_category: (formData.get('category') as BlogCategory) || 'conseils',
    p_status: status,
    p_title_ar: text('title_ar'),
    p_excerpt: text('excerpt'),
    p_excerpt_ar: text('excerpt_ar'),
    p_body_ar: text('body_ar'),
    p_cover: text('cover_image_path'),
    // Vides, la base les met a null et l'affichage retombe sur le titre et le
    // chapo de l'article.
    p_seo_title: text('seo_title'),
    p_seo_title_ar: text('seo_title_ar'),
    p_seo_description: text('seo_description'),
    p_seo_description_ar: text('seo_description_ar'),
  })

  if (error) return { error: explain(error) }

  // Le slug a pu être suffixé côté base pour rester unique : on relit plutôt que
  // de supposer, sinon le lien « voir en ligne » mènerait à une page absente.
  const savedId = typeof data === 'string' ? data : (postId ?? undefined)
  let slug: string | undefined
  if (savedId) {
    const { data: row } = await supabase
      .from('blog_posts')
      .select('slug')
      .eq('id', savedId)
      .maybeSingle()
    slug = (row as { slug: string } | null)?.slug
  }

  revalidatePath(path('/admin/blog'))
  revalidatePath(path('/blog'))
  if (slug) revalidatePath(path(`/blog/${slug}`))

  return { postId: savedId, slug }
}

export async function deletePost(formData: FormData) {
  const { supabase, path } = await adminClient()
  const postId = formData.get('post_id') as string

  const { error } = await supabase.rpc('admin_delete_post', { p_id: postId })

  // Une suppression qui échoue en silence est indiscernable d'une suppression
  // réussie : l'écran se recharge et l'article est toujours là, sans explication.
  if (error) {
    redirect(`${path('/admin/blog')}?erreur=${encodeURIComponent(explain(error))}`)
  }

  revalidatePath(path('/admin/blog'))
  revalidatePath(path('/blog'))
  redirect(`${path('/admin/blog')}?supprime=1`)
}

/**
 * Compteur de lectures.
 *
 * Volontairement silencieux : un compteur qui ne s'incrémente pas ne doit pas
 * empêcher de lire l'article.
 */
export async function countPostView(slug: string) {
  try {
    const supabase = await createSupabaseServerClient()
    await supabase.rpc('increment_post_views', { p_slug: slug })
  } catch (error) {
    console.error('[ntcharkou] compteur de lectures :', error)
  }
}
