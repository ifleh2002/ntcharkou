/**
 * Compteurs d'un projet — cas limites.
 *   node --experimental-strip-types --test src/lib/project-counters.test.ts
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeCounters, toCount } from './project-counters.ts'

test('une colonne absente vaut 0, jamais une chaîne vide', () => {
  // Le cas rencontré en production : la vue ne publiait pas encore
  // `units_reserved`, et la légende affichait « / 140 » sans chiffre devant.
  const row = { units_planned: 140 }
  const counters = normalizeCounters(row)

  assert.equal(counters.units_reserved, 0)
  assert.equal(counters.units_planned, 140)
  assert.equal(`${counters.units_reserved} / ${counters.units_planned}`, '0 / 140')
})

test('les valeurs présentes sont conservées', () => {
  const counters = normalizeCounters({
    units_planned: 140,
    units_reserved: 2,
    units_pending: 3,
    participants_confirmed: 1,
    participants_pending: 2,
  })

  // Deux unités réservées par un seul adhérent : les deux grandeurs diffèrent
  // et ne doivent pas être confondues.
  assert.equal(counters.units_reserved, 2)
  assert.equal(counters.participants_confirmed, 1)
  assert.equal(counters.units_pending, 3)
})

test('un entier arrive toujours, quelle que soit la forme reçue', () => {
  // PostgREST sérialise `sum()` (bigint) en nombre, mais une couche
  // intermédiaire peut renvoyer une chaîne : les deux doivent tenir.
  assert.equal(toCount('7'), 7)
  assert.equal(toCount(7), 7)
  assert.equal(toCount(7.9), 7)
})

test('aucune entrée ne produit NaN ni valeur négative', () => {
  for (const value of [undefined, null, '', 'abc', Number.NaN, Infinity, -Infinity, -5, {}, []]) {
    const result = toCount(value)
    assert.ok(Number.isFinite(result), `valeur non finie pour ${JSON.stringify(value)}`)
    assert.ok(result >= 0, `valeur négative pour ${JSON.stringify(value)}`)
  }
})

test('une ligne entièrement vide reste affichable', () => {
  const counters = normalizeCounters({})
  for (const [key, value] of Object.entries(counters)) {
    assert.equal(value, 0, `${key} devrait valoir 0`)
    assert.ok(!Number.isNaN(value))
  }
})
