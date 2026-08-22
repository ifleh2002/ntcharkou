import type { MetadataRoute } from 'next'
import { LOCALES } from '@/lib/i18n/config'
import { listPosts } from '@/lib/queries'
import { languageAlternates, siteUrl } from '@/lib/seo'

/**
 * Plan du site.
 *
 * Sans lui, un moteur ne découvre une page que si un lien y mène depuis une
 * page déjà connue : un article publié aujourd'hui peut attendre des semaines.
 *
 * Chaque entrée déclare ses variantes de langue. Sur un site bilingue, deux
 * URL portant le même contenu dans deux langues ne sont pas des doublons — mais
 * il faut le dire, sinon un moteur en choisit une et ignore l'autre.
 */
export const revalidate = 3600

/** Pages fixes, avec l'importance relative que leur rôle justifie. */
const STATIC_PAGES: { path: string; priority: number; frequency: 'daily' | 'weekly' | 'monthly' }[] =
  [
    { path: '/', priority: 1, frequency: 'daily' },
    { path: '/terrains', priority: 0.9, frequency: 'daily' },
    { path: '/projets', priority: 0.9, frequency: 'daily' },
    { path: '/carte', priority: 0.7, frequency: 'weekly' },
    { path: '/blog', priority: 0.8, frequency: 'weekly' },
    { path: '/comment-ca-marche', priority: 0.6, frequency: 'monthly' },
    { path: '/a-propos', priority: 0.4, frequency: 'monthly' },
    { path: '/faq', priority: 0.5, frequency: 'monthly' },
    { path: '/contact', priority: 0.4, frequency: 'monthly' },
  ]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl('/')
  // Sans adresse de site, un plan ne contiendrait que des chemins relatifs :
  // inexploitable. Mieux vaut ne rien publier que publier de fausses adresses.
  if (!base) return []

  const entries: MetadataRoute.Sitemap = []

  for (const page of STATIC_PAGES) {
    for (const locale of LOCALES) {
      entries.push({
        url: siteUrl(`/${locale}${page.path === '/' ? '' : page.path}`) as string,
        changeFrequency: page.frequency,
        priority: page.priority,
        alternates: { languages: languageAlternates(page.path) },
      })
    }
  }

  // Les articles sont lus une fois par langue : la traduction change le titre
  // et le corps, mais l'adresse et les dates restent celles de l'article.
  for (const locale of LOCALES) {
    const posts = await listPosts({ limit: 500 }, locale)
    for (const post of posts) {
      entries.push({
        url: siteUrl(`/${locale}/blog/${post.slug}`) as string,
        lastModified: post.updated_at ?? post.published_at ?? post.created_at,
        changeFrequency: 'monthly',
        priority: 0.7,
        alternates: { languages: languageAlternates(`/blog/${post.slug}`) },
      })
    }
  }

  return entries
}
