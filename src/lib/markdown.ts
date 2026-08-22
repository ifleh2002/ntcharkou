/**
 * Rendu d'un Markdown restreint.
 *
 * Module pur — aucune dépendance — donc testable seul.
 *
 * Pourquoi ne pas stocker du HTML : le corps d'un article passe par la base
 * puis ressort dans la page. Stocker du HTML obligerait à faire confiance à ce
 * qui a été écrit, aujourd'hui comme après n'importe quelle reprise de données.
 * Ici tout est échappé d'abord, et seule une grammaire connue est reconstruite
 * ensuite : aucune balise saisie ne peut atteindre la page.
 *
 * La grammaire couvre ce qu'un article de fond demande — titres, paragraphes,
 * listes, citations, gras, italique, liens — et rien de plus. Une syntaxe non
 * reconnue s'affiche telle quelle plutôt que de disparaître.
 */

/**
 * Identifiant d'ancre d'un titre.
 *
 * Les lettres de toutes les écritures sont conservées : un titre arabe doit
 * produire une ancre arabe, pas une ancre vide. Un titre qui ne contient aucune
 * lettre reçoit un repli numéroté, sinon deux sections partageraient la même
 * ancre et le sommaire renverrait toujours au même endroit.
 *
 * Le traitement des signes diacritiques demande une précision qui a manqué à la
 * première version. Décomposer puis retirer la plage `U+0300–U+036F` supprime
 * les accents latins — c'est le but : « Réquisition » doit donner
 * « requisition ». Mais la hamza arabe vit HORS de cette plage : décomposée,
 * elle survivait au filtre des accents pour se faire ensuite éliminer comme
 * « caractère non alphabétique », et « الأكثر » sortait coupé en
 * « الا-كثر ». On conserve donc les marques (`\p{M}`), puis on recompose en
 * NFC : l'arabe retrouve sa graphie d'origine, le latin garde son accent retiré.
 */
export function headingId(text: string, index: number): string {
  const slug = text
    .normalize('NFD')
    // Accents latins uniquement : cette plage ne contient aucune marque arabe.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    // Recomposition : sans elle, l'ancre porterait une hamza détachée de sa
    // lettre, illisible dans une barre d'adresse.
    .normalize('NFC')

  return slug || `section-${index}`
}

/** Échappe tout ce qui pourrait être interprété comme du balisage. */
function escape(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
}

/**
 * Balisage de niveau texte, appliqué après échappement.
 *
 * Les liens n'acceptent que `http(s)` et les chemins internes : `javascript:`
 * dans un lien Markdown est un vecteur classique, et il n'a aucune raison
 * d'exister dans un article.
 */
function inline(text: string): string {
  return escape(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label: string, href: string) => {
      const safe = /^(https?:\/\/|\/)/i.test(href)
      if (!safe) return whole
      const external = href.startsWith('http')
      const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : ''
      return `<a href="${href}"${attrs}>${label}</a>`
    })
}

/**
 * Rend un texte Markdown en HTML sûr.
 *
 * Le découpage se fait par blocs séparés d'une ligne vide, comme en Markdown :
 * c'est ce qui permet à une liste de rester une liste et à un paragraphe de ne
 * pas absorber le titre qui le suit.
 */
export function renderMarkdown(source: string | null | undefined): string {
  if (!source) return ''

  const blocks = source.replace(/\r\n/g, '\n').trim().split(/\n{2,}/)
  const html: string[] = []
  // Compteur de titres : il alimente les ancres, et le sommaire construit par
  // `outline()` suit exactement la même numérotation.
  let headingIndex = 0

  for (const block of blocks) {
    const lines = block.split('\n').filter((line) => line.trim() !== '')
    if (lines.length === 0) continue

    // Titres
    const heading = lines[0].match(/^(#{2,4})\s+(.*)$/)
    if (heading && lines.length === 1) {
      const level = heading[1].length
      headingIndex += 1
      // L'ancre permet de citer une section précise : c'est ce qu'attendent les
      // moteurs de réponse pour renvoyer vers le passage exact, et non vers le
      // haut de la page.
      const id = headingId(heading[2], headingIndex)
      html.push(`<h${level} id="${escape(id)}">${inline(heading[2])}</h${level}>`)
      continue
    }

    // Liste à puces
    if (lines.every((line) => /^[-*]\s+/.test(line.trim()))) {
      const items = lines.map((line) => `<li>${inline(line.trim().replace(/^[-*]\s+/, ''))}</li>`)
      html.push(`<ul>${items.join('')}</ul>`)
      continue
    }

    // Liste numérotée
    if (lines.every((line) => /^\d+[.)]\s+/.test(line.trim()))) {
      const items = lines.map((line) => `<li>${inline(line.trim().replace(/^\d+[.)]\s+/, ''))}</li>`)
      html.push(`<ol>${items.join('')}</ol>`)
      continue
    }

    // Citation
    if (lines.every((line) => /^>\s?/.test(line.trim()))) {
      const text = lines.map((line) => line.trim().replace(/^>\s?/, '')).join(' ')
      html.push(`<blockquote>${inline(text)}</blockquote>`)
      continue
    }

    // Séparateur
    if (lines.length === 1 && /^-{3,}$/.test(lines[0].trim())) {
      html.push('<hr>')
      continue
    }

    // Paragraphe : les retours simples sont des retours à la ligne.
    html.push(`<p>${lines.map(inline).join('<br>')}</p>`)
  }

  return html.join('\n')
}

/**
 * Extrait un résumé du corps, quand l'auteur n'en a pas rédigé.
 *
 * On saute les titres : commencer un résumé par le titre de la première section
 * ne dit rien de l'article.
 */
export function excerptFrom(source: string | null | undefined, maxLength = 180): string {
  if (!source) return ''

  const firstParagraph = source
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find((block) => block !== '' && !block.startsWith('#') && !/^[-*>]\s/.test(block))

  if (!firstParagraph) return ''

  const plain = firstParagraph
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

  if (plain.length <= maxLength) return plain
  // On coupe au dernier mot entier : tronquer en plein milieu se voit.
  return `${plain.slice(0, plain.lastIndexOf(' ', maxLength)).trimEnd()}…`
}
