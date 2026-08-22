/**
 * Référencement des articles : sommaire, questions fréquentes, données
 * structurées.
 *
 * Module pur — aucune dépendance, aucun accès réseau — donc testable seul.
 *
 * Deux publics, deux besoins :
 *
 *   - un moteur de recherche classe une page sur des signaux de structure :
 *     titre, description, dates, hiérarchie des titres, données structurées ;
 *   - un moteur de réponse (ChatGPT, Perplexity, l'aperçu IA de Google) extrait
 *     un passage et le cite. Il lui faut une réponse courte et autonome, des
 *     questions posées telles qu'un lecteur les pose, et des ancres pour
 *     désigner un passage précis plutôt que la page entière.
 *
 * Le parti pris est le même dans les deux cas : rien n'est saisi deux fois. Le
 * sommaire et les questions fréquentes sont *déduits du corps de l'article*.
 * Une donnée structurée qui décrit une question absente de la page est un
 * mensonge — Google la sanctionne, et un lecteur venu la lire ne la trouve pas.
 */

// Extension explicite : le module est aussi executé tel quel par le lanceur de
// tests de Node, qui ne resout pas les imports sans extension.
import { headingId } from './markdown.ts'

export interface OutlineEntry {
  id: string
  level: number
  text: string
}

export interface FaqEntry {
  question: string
  answer: string
}

/** Retire le balisage d'un fragment, pour une donnée structurée ou un résumé. */
function plain(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Sommaire de l'article, déduit des titres de niveau 2 et 3.
 *
 * La numérotation suit celle de `renderMarkdown`, sans quoi une entrée du
 * sommaire renverrait vers une ancre qui n'existe pas.
 */
export function outline(source: string | null | undefined): OutlineEntry[] {
  if (!source) return []

  const entries: OutlineEntry[] = []
  let index = 0

  for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
    const match = line.match(/^(#{2,4})\s+(.*)$/)
    if (!match) continue

    // Tous les titres comptent, y compris ceux de niveau 4 qui ne figurent pas
    // au sommaire : c'est le compteur d'ancres, il doit rester aligné.
    index += 1
    const level = match[1].length
    if (level > 3) continue

    const text = plain(match[2])
    if (!text) continue
    entries.push({ id: headingId(match[2], index), level, text })
  }

  return entries
}

/**
 * Questions fréquentes, déduites des titres formulés comme des questions.
 *
 * Convention volontairement neutre : **tout titre de niveau 3 qui se termine
 * par un point d'interrogation** est une question, et le texte qui suit,
 * jusqu'au titre suivant, en est la réponse. Elle vaut pour le français comme
 * pour l'arabe — « ؟ » compte autant que « ? » — là où reconnaître une section
 * « Questions fréquentes » par son intitulé obligerait à connaître d'avance sa
 * traduction dans chaque langue.
 *
 * La réponse est tronquée : une donnée structurée n'est pas l'article, et une
 * réponse interminable n'est reprise par personne.
 */
export function extractFaq(source: string | null | undefined, maxAnswer = 600): FaqEntry[] {
  if (!source) return []

  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const faq: FaqEntry[] = []

  let question: string | null = null
  let buffer: string[] = []

  const flush = () => {
    if (!question) return
    const answer = plain(buffer.join(' ')).slice(0, maxAnswer).trim()
    // Une question sans réponse ne doit pas entrer dans les données
    // structurées : elle annoncerait un contenu que la page n'a pas.
    if (answer) faq.push({ question, answer })
    question = null
    buffer = []
  }

  for (const line of lines) {
    const heading = line.match(/^(#{2,4})\s+(.*)$/)
    if (heading) {
      flush()
      const text = plain(heading[2])
      if (heading[1].length === 3 && /[?？؟]\s*$/.test(text)) {
        question = text
      }
      continue
    }
    if (question && line.trim()) buffer.push(line.trim())
  }
  flush()

  return faq
}

/**
 * Adresse absolue d'un chemin applicatif.
 *
 * Une balise canonique ou un plan de site en chemin relatif ne sert à rien :
 * les deux exigent une URL complète. Sans `NEXT_PUBLIC_SITE_URL`, on renvoie
 * `null` plutôt qu'une adresse inventée — une canonique fausse est pire que pas
 * de canonique, elle désigne une autre page comme l'original.
 */
export function siteUrl(path = '/'): string | null {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '')
  if (!base) return null
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Variantes linguistiques d'une page, pour `alternates.languages`.
 *
 * `x-default` désigne la version servie à qui n'exprime aucune préférence :
 * sans elle, un moteur choisit lui-même, et se trompe régulièrement de langue
 * sur un site bilingue.
 *
 * Les adresses sont ABSOLUES. La première version renvoyait des chemins
 * relatifs, et Next les publiait tels quels : `hreflang` n'accepte que des URL
 * complètes, si bien que les trois balises étaient présentes dans la page et
 * ignorées par Google. Une annotation inerte est pire qu'absente — elle donne
 * l'impression que le travail est fait.
 *
 * Sans `NEXT_PUBLIC_SITE_URL`, on ne publie RIEN plutôt que des chemins
 * relatifs : même raison que pour la canonique, une annotation qu'aucun moteur
 * ne peut suivre n'a pas à figurer dans la page.
 */
export function languageAlternates(pathWithoutLocale: string): Record<string, string> {
  const suffix = pathWithoutLocale === '/' ? '' : pathWithoutLocale

  const fr = siteUrl(`/fr${suffix}`)
  const ar = siteUrl(`/ar${suffix}`)
  if (!fr || !ar) return {}

  return { fr, ar, 'x-default': fr }
}

/** Sérialise un objet JSON-LD pour une insertion en balise `<script>`. */
export function jsonLd(data: unknown): string {
  // `<` échappé : une chaîne contenant « </script> » fermerait la balise et le
  // reste du document serait interprété comme du HTML.
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export interface ArticleSchemaInput {
  title: string
  description: string
  url: string | null
  imageUrl: string | null
  publishedAt: string | null
  updatedAt: string | null
  authorName: string | null
  locale: string
  section: string
  wordCount: number
  faq: FaqEntry[]
  breadcrumb: { name: string; url: string | null }[]
}

/**
 * Données structurées d'un article : la fiche, le fil d'Ariane et les
 * questions fréquentes, réunis en un seul graphe.
 *
 * Un `@graph` unique plutôt que trois balises séparées : les entités s'y citent
 * par identifiant, ce qui dit explicitement que la question fréquente appartient
 * à cet article-là, et pas seulement à la page.
 */
export function articleSchema(input: ArticleSchemaInput): object {
  const publisher = {
    '@type': 'Organization',
    name: 'Ntcharkou',
    url: siteUrl('/') ?? undefined,
  }

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'BlogPosting',
      ...(input.url ? { '@id': `${input.url}#article`, url: input.url } : {}),
      headline: input.title,
      description: input.description,
      inLanguage: input.locale,
      articleSection: input.section,
      ...(input.wordCount > 0 ? { wordCount: input.wordCount } : {}),
      ...(input.imageUrl ? { image: [input.imageUrl] } : {}),
      ...(input.publishedAt ? { datePublished: input.publishedAt } : {}),
      // `dateModified` retombe sur la date de publication : l'omettre ferait
      // passer un article révisé pour un article jamais relu.
      dateModified: input.updatedAt ?? input.publishedAt ?? undefined,
      author: input.authorName
        ? { '@type': 'Person', name: input.authorName }
        : publisher,
      publisher,
      ...(input.url ? { mainEntityOfPage: { '@type': 'WebPage', '@id': input.url } } : {}),
    },
  ]

  if (input.breadcrumb.length > 0) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: input.breadcrumb.map((item, position) => ({
        '@type': 'ListItem',
        position: position + 1,
        name: item.name,
        ...(item.url ? { item: item.url } : {}),
      })),
    })
  }

  if (input.faq.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      ...(input.url ? { '@id': `${input.url}#faq` } : {}),
      mainEntity: input.faq.map((entry) => ({
        '@type': 'Question',
        name: entry.question,
        acceptedAnswer: { '@type': 'Answer', text: entry.answer },
      })),
    })
  }

  return { '@context': 'https://schema.org', '@graph': graph }
}

/** Nombre de mots d'un texte, toutes écritures confondues. */
export function wordCount(source: string | null | undefined): number {
  if (!source) return 0
  const words = plain(source).match(/[\p{L}\p{N}]+/gu)
  return words?.length ?? 0
}

/**
 * Tronque une description de balise `meta`.
 *
 * Au-delà d'environ 160 signes, un moteur coupe lui-même, souvent en plein
 * milieu d'une phrase. Mieux vaut couper sur un mot entier.
 */
export function metaDescription(text: string | null | undefined, max = 160): string {
  if (!text) return ''
  const clean = plain(text)
  if (clean.length <= max) return clean

  const cut = clean.lastIndexOf(' ', max)
  return `${clean.slice(0, cut > 0 ? cut : max).trimEnd()}…`
}
