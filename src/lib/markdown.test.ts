/**
 * Rendu Markdown — grammaire reconnue et sûreté.
 *   node --experimental-strip-types --test src/lib/markdown.test.ts
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { excerptFrom, renderMarkdown } from './markdown.ts'

test('aucune balise saisie n’atteint la page', () => {
  // Le cas qui compte : le corps traverse la base avant de revenir dans la
  // page. Rien de ce qui est écrit ne doit s'exécuter.
  const html = renderMarkdown('Bonjour <script>alert(1)</script> et <img onerror="x">')
  assert.ok(!html.includes('<script'), 'balise script rendue telle quelle')
  assert.ok(!html.includes('<img'), 'balise img rendue telle quelle')
  assert.ok(html.includes('&lt;script&gt;'), 'la balise doit apparaître comme du texte')
})

test('un lien javascript: n’est pas transformé en lien', () => {
  const html = renderMarkdown('[cliquez](javascript:alert(1))')
  assert.ok(!html.includes('href="javascript'), 'protocole refusé')
  assert.ok(html.includes('[cliquez]'), 'la syntaxe reste visible plutôt que de disparaître')
})

test('les liens légitimes passent, l’externe s’ouvre à part', () => {
  const externe = renderMarkdown('Voir [le portail](https://exemple.ma/page).')
  assert.ok(externe.includes('href="https://exemple.ma/page"'))
  assert.ok(externe.includes('rel="noopener noreferrer"'))

  const interne = renderMarkdown('Voir [nos terrains](/fr/terrains).')
  assert.ok(interne.includes('href="/fr/terrains"'))
  assert.ok(!interne.includes('target='), 'un lien interne reste dans l’onglet')
})

test('titres, listes et citations sont reconnus', () => {
  assert.ok(renderMarkdown('## Le titre').includes('<h2>Le titre</h2>'))
  assert.ok(renderMarkdown('### Sous-titre').includes('<h3>Sous-titre</h3>'))

  const liste = renderMarkdown('- premier\n- second')
  assert.ok(liste.includes('<ul>') && liste.includes('<li>premier</li>'))

  const numerotee = renderMarkdown('1. premier\n2. second')
  assert.ok(numerotee.includes('<ol>') && numerotee.includes('<li>second</li>'))

  assert.ok(renderMarkdown('> une citation').includes('<blockquote>une citation</blockquote>'))
})

test('gras et italique, sans se confondre', () => {
  assert.ok(renderMarkdown('Un **mot** important').includes('<strong>mot</strong>'))
  assert.ok(renderMarkdown('Un *mot* nuancé').includes('<em>mot</em>'))
  // Le gras ne doit pas être découpé en deux italiques.
  const gras = renderMarkdown('**tout gras**')
  assert.ok(gras.includes('<strong>tout gras</strong>'))
  assert.ok(!gras.includes('<em>'))
})

test('les blocs restent séparés', () => {
  const html = renderMarkdown('## Titre\n\nUn paragraphe.\n\n- a\n- b')
  assert.ok(html.includes('<h2>'))
  assert.ok(html.includes('<p>Un paragraphe.</p>'))
  assert.ok(html.includes('<ul>'))
  // Un paragraphe ne doit pas avaler la liste qui suit.
  assert.ok(!html.includes('<p>Un paragraphe.<br>- a'))
})

test('une entrée vide ou absente ne casse rien', () => {
  assert.equal(renderMarkdown(''), '')
  assert.equal(renderMarkdown(null), '')
  assert.equal(renderMarkdown(undefined), '')
  assert.equal(renderMarkdown('   \n\n  '), '')
})

test('le résumé automatique saute les titres', () => {
  const resume = excerptFrom('## Un titre\n\nLe vrai début du texte.\n\nLa suite.')
  assert.equal(resume, 'Le vrai début du texte.')
})

test('le résumé coupe sur un mot entier', () => {
  const long = `${'mot '.repeat(80)}fin`
  const resume = excerptFrom(long, 50)
  assert.ok(resume.length <= 52, `trop long : ${resume.length}`)
  assert.ok(resume.endsWith('…'))
  assert.ok(!resume.includes('mo…'), 'la coupe doit tomber entre deux mots')
})

test('le résumé retire le balisage', () => {
  const resume = excerptFrom('Un **terrain** avec [un lien](https://x.ma) et `du code`.')
  assert.equal(resume, 'Un terrain avec un lien et du code.')
})
