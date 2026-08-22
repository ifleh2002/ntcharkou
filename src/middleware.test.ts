/**
 * Périmètre du middleware de langue.
 *   node --experimental-strip-types --test src/middleware.test.ts
 *
 * Pourquoi ce fichier existe : `robots.txt` et `sitemap.xml` sont partis en
 * production en répondant 404. Le middleware les capturait, les redirigeait vers
 * `/fr/robots.txt`, et cette route n'existe pas. Rien ne le signalait — une
 * redirection réussie suivie d'un 404 se lit comme une page simplement absente,
 * et la construction du projet passait sans un mot.
 *
 * Le `matcher` ne peut pas être importé : Next exige qu'il soit une valeur
 * littérale, analysable statiquement, donc il ne peut pas venir d'un module
 * partagé. On lit donc le fichier source et on en extrait l'expression, ce qui
 * évite d'en maintenir une copie qui divergerait en silence.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

/** Extrait l'expression du `matcher` depuis le source du middleware. */
function matcherPattern(): string {
  const source = readFileSync(new URL('./middleware.ts', import.meta.url), 'utf8')
  const match = source.match(/matcher:\s*\[\s*'([^']+)'/)
  assert.ok(match, 'matcher introuvable dans src/middleware.ts')
  // Le source échappe les antislashs pour TypeScript ; on rétablit l'expression.
  return match[1].replace(/\\\\/g, '\\')
}

/**
 * Le middleware s'exécute-t-il sur ce chemin ?
 *
 * Approximation de la résolution de Next, suffisante ici : le motif est une
 * expression régulière ancrée sur le chemin complet.
 */
function middlewareRuns(pathname: string): boolean {
  return new RegExp(`^${matcherPattern()}$`).test(pathname)
}

test('robots.txt et sitemap.xml échappent au middleware', () => {
  // Le défaut exact parti en production.
  assert.equal(middlewareRuns('/robots.txt'), false, '/robots.txt serait redirigé vers /fr/robots.txt')
  assert.equal(middlewareRuns('/sitemap.xml'), false, '/sitemap.xml serait redirigé vers /fr/sitemap.xml')
})

test('les pages du site restent couvertes', () => {
  // Sans le middleware, ces chemins ne recevraient pas leur préfixe de langue.
  for (const path of ['/', '/terrains', '/fr/blog', '/ar/blog/mon-article', '/fr/admin']) {
    assert.equal(middlewareRuns(path), true, `${path} doit passer par le middleware`)
  }
})

test('les ressources statiques restent exclues', () => {
  for (const path of [
    '/_next/static/chunks/main.js',
    '/_next/image',
    '/favicon.ico',
    '/logo.svg',
    '/photo.jpg',
    '/visuel.webp',
  ]) {
    assert.equal(middlewareRuns(path), false, `${path} ne doit pas passer par le middleware`)
  }
})
