import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/seo'

/**
 * Règles d'exploration.
 *
 * Deux catégories sont fermées, pour la même raison : elles ne contiennent
 * aucune page utile à un visiteur venu d'une recherche, et leur exploration
 * consomme le budget que le moteur consacre au site.
 *
 *   - `/admin` : le back-office, déjà protégé par l'authentification ;
 *   - l'espace personnel : des pages qui n'existent que pour leur titulaire.
 *
 * Les robots des moteurs de réponse (GPTBot, ClaudeBot, PerplexityBot…) ne sont
 * PAS bloqués : les articles sont écrits pour être cités, et un blocage les
 * rendrait invisibles là où le site a précisément intérêt à apparaître.
 */
export default function robots(): MetadataRoute.Robots {
  const sitemap = siteUrl('/sitemap.xml')

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/fr/admin',
          '/ar/admin',
          '/fr/tableau-de-bord',
          '/ar/tableau-de-bord',
          '/fr/mes-',
          '/ar/mes-',
          '/fr/profil',
          '/ar/profil',
          '/fr/parametres',
          '/ar/parametres',
          '/fr/favoris',
          '/ar/favoris',
          '/fr/notifications',
          '/ar/notifications',
        ],
      },
    ],
    ...(sitemap ? { sitemap } : {}),
  }
}
