/**
 * Référencement : sommaire, questions fréquentes, données structurées.
 *   node --experimental-strip-types --test src/lib/seo.test.ts
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderMarkdown } from './markdown.ts'
import {
  articleSchema,
  extractFaq,
  jsonLd,
  languageAlternates,
  metaDescription,
  outline,
  wordCount,
} from './seo.ts'

const ARTICLE = `Un chapô qui répond directement.

## Le titre foncier

Le régime le plus sûr.

### Comment vérifier un titre foncier ?

Demandez un certificat de propriété de moins de trois mois.
Il porte les hypothèques et les oppositions.

### Combien de temps dure une immatriculation ?

Plusieurs années selon les oppositions.

## Pour aller plus loin

Un dernier paragraphe.`

test('le sommaire suit exactement les ancres du rendu', () => {
  const entries = outline(ARTICLE)
  const html = renderMarkdown(ARTICLE)

  assert.equal(entries.length, 4)
  // Le contrat qui compte : chaque entrée doit désigner une ancre réellement
  // présente dans la page, sinon le sommaire renvoie dans le vide.
  for (const entry of entries) {
    assert.ok(html.includes(`id="${entry.id}"`), `ancre absente : ${entry.id}`)
  }
  assert.deepEqual(
    entries.map((entry) => entry.level),
    [2, 3, 3, 2],
  )
})

test('un titre de niveau 4 ne décale pas les ancres', () => {
  // Les titres de niveau 4 sont rendus mais absents du sommaire : si le
  // compteur les ignorait, toutes les ancres suivantes seraient décalées.
  const source = '## Un\n\n#### Détail\n\n## Deux'
  const html = renderMarkdown(source)
  for (const entry of outline(source)) {
    assert.ok(html.includes(`id="${entry.id}"`), `ancre absente : ${entry.id}`)
  }
})

test('les questions fréquentes sortent des titres interrogatifs', () => {
  const faq = extractFaq(ARTICLE)
  assert.equal(faq.length, 2)
  assert.equal(faq[0].question, 'Comment vérifier un titre foncier ?')
  assert.ok(faq[0].answer.startsWith('Demandez un certificat'))
  // La réponse s'arrête au titre suivant.
  assert.ok(!faq[0].answer.includes('Plusieurs années'))
})

test('un titre de section ordinaire n’est pas une question', () => {
  const faq = extractFaq(ARTICLE)
  assert.ok(!faq.some((entry) => entry.question.startsWith('Le titre foncier')))
  assert.ok(!faq.some((entry) => entry.question.startsWith('Pour aller plus loin')))
})

test('le point d’interrogation arabe compte autant que le français', () => {
  const faq = extractFaq('## باب\n\n### ما هو الرسم العقاري؟\n\nهو سند الملكية النهائي.')
  assert.equal(faq.length, 1)
  assert.equal(faq[0].question, 'ما هو الرسم العقاري؟')
  assert.equal(faq[0].answer, 'هو سند الملكية النهائي.')
})

test('une question sans réponse n’entre pas dans les données structurées', () => {
  // Annoncer une question que la page ne traite pas est exactement ce que
  // Google sanctionne, et ce qu'un lecteur venu la lire ne trouve pas.
  const faq = extractFaq('### Une question sans suite ?\n\n### Une autre ?\n\nUne réponse.')
  assert.equal(faq.length, 1)
  assert.equal(faq[0].question, 'Une autre ?')
})

test('le balisage est retiré des réponses', () => {
  const faq = extractFaq('### Et alors ?\n\nUn **mot** et [un lien](https://x.ma).')
  assert.equal(faq[0].answer, 'Un mot et un lien.')
})

test('les variantes de langue couvrent les deux langues et le repli', () => {
  assert.deepEqual(languageAlternates('/blog/mon-article'), {
    fr: '/fr/blog/mon-article',
    ar: '/ar/blog/mon-article',
    'x-default': '/fr/blog/mon-article',
  })
  assert.deepEqual(languageAlternates('/'), {
    fr: '/fr',
    ar: '/ar',
    'x-default': '/fr',
  })
})

test('la description meta coupe sur un mot entier', () => {
  const long = `${'mot '.repeat(80)}fin`
  const description = metaDescription(long, 60)
  assert.ok(description.length <= 62, `trop long : ${description.length}`)
  assert.ok(description.endsWith('…'))
  assert.ok(!description.includes('mo…'))
  // Le balisage ne doit pas se retrouver dans une balise meta.
  assert.equal(metaDescription('Un **terrain** [titré](https://x.ma).'), 'Un terrain titré.')
})

test('les mots se comptent aussi en arabe', () => {
  assert.equal(wordCount('Un terrain titré'), 3)
  assert.equal(wordCount('الرسم العقاري النهائي'), 3)
  assert.equal(wordCount(null), 0)
})

test('le graphe décrit l’article, le fil d’Ariane et les questions', () => {
  const schema = articleSchema({
    title: 'Le titre foncier',
    description: 'Comment lire le statut juridique.',
    url: 'https://ntcharkou.ma/fr/blog/titre-foncier',
    imageUrl: 'https://ntcharkou.ma/img.jpg',
    publishedAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-10T10:00:00Z',
    authorName: 'Ntcharkou',
    locale: 'fr',
    section: 'Réglementation',
    wordCount: 900,
    faq: extractFaq(ARTICLE),
    breadcrumb: [
      { name: 'Blog', url: 'https://ntcharkou.ma/fr/blog' },
      { name: 'Le titre foncier', url: 'https://ntcharkou.ma/fr/blog/titre-foncier' },
    ],
  }) as { '@graph': Record<string, unknown>[] }

  const types = schema['@graph'].map((node) => node['@type'])
  assert.deepEqual(types, ['BlogPosting', 'BreadcrumbList', 'FAQPage'])

  const article = schema['@graph'][0]
  assert.equal(article.datePublished, '2026-08-01T10:00:00Z')
  assert.equal(article.dateModified, '2026-08-10T10:00:00Z')
  assert.equal(article.inLanguage, 'fr')

  const faqNode = schema['@graph'][2] as { mainEntity: { name: string }[] }
  assert.equal(faqNode.mainEntity.length, 2)
})

test('un article jamais révisé porte quand même une date de modification', () => {
  const schema = articleSchema({
    title: 'T',
    description: 'D',
    url: null,
    imageUrl: null,
    publishedAt: '2026-08-01T10:00:00Z',
    updatedAt: null,
    authorName: null,
    locale: 'fr',
    section: 'Conseils',
    wordCount: 0,
    faq: [],
    breadcrumb: [],
  }) as { '@graph': Record<string, unknown>[] }

  assert.equal(schema['@graph'][0].dateModified, '2026-08-01T10:00:00Z')
  // Sans question dans l'article, pas de bloc FAQPage.
  assert.equal(schema['@graph'].length, 1)
})

test('un contenu ne peut pas refermer la balise script', () => {
  const serialized = jsonLd({ name: 'Fin </script><img onerror="x">' })
  assert.ok(!serialized.includes('</script>'), serialized)
  assert.ok(serialized.includes('\\u003c'))
})
