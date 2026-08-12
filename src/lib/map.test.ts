/**
 * Conversions cartographiques — cas limites.
 *   node --experimental-strip-types --test src/lib/map.test.ts
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { approximateArea, marketColor, polygonToVertices, verticesToPolygon } from './map.ts'

// Rectangle d'environ 100 m sur 100 m près de Casablanca, en [lat, lng].
const CARRE: [number, number][] = [
  [33.5731, -7.6298],
  [33.5731, -7.62872],
  [33.574, -7.62872],
  [33.574, -7.6298],
]

test('le polygone produit est en [longitude, latitude], pas l’inverse', () => {
  const polygon = verticesToPolygon(CARRE)
  assert.ok(polygon)

  const [lng, lat] = polygon.coordinates[0][0]
  // Inverser l'ordre placerait cette parcelle marocaine en Somalie, sans que
  // rien ne le signale : on vérifie donc les deux valeurs séparément.
  assert.ok(lng < 0 && lng > -20, `longitude attendue négative (Maroc), reçue ${lng}`)
  assert.ok(lat > 20 && lat < 40, `latitude attendue autour de 33, reçue ${lat}`)
})

test('l’anneau est fermé : PostGIS refuse un contour ouvert', () => {
  const ring = verticesToPolygon(CARRE)!.coordinates[0]
  assert.deepEqual(ring[0], ring[ring.length - 1])
  assert.equal(ring.length, CARRE.length + 1)
})

test('un anneau déjà fermé n’est pas fermé deux fois', () => {
  const ferme: [number, number][] = [...CARRE, CARRE[0]]
  const ring = verticesToPolygon(ferme)!.coordinates[0]
  assert.deepEqual(ring[0], ring[ring.length - 1])
  assert.equal(ring.length, ferme.length, 'aucun point de fermeture surnuméraire')
})

test('deux sommets ne délimitent pas une surface', () => {
  assert.equal(verticesToPolygon([]), null)
  assert.equal(verticesToPolygon([[33.5, -7.6]]), null)
  assert.equal(
    verticesToPolygon([
      [33.5, -7.6],
      [33.6, -7.5],
    ]),
    null,
  )
})

test('l’aller-retour GeoJSON conserve les sommets', () => {
  const retour = polygonToVertices(verticesToPolygon(CARRE))
  assert.equal(retour.length, CARRE.length)
  retour.forEach(([lat, lng], index) => {
    assert.ok(Math.abs(lat - CARRE[index][0]) < 1e-9)
    assert.ok(Math.abs(lng - CARRE[index][1]) < 1e-9)
  })
})

test('un polygone absent ou tronqué ne casse pas la lecture', () => {
  assert.deepEqual(polygonToVertices(null), [])
  assert.deepEqual(polygonToVertices(undefined), [])
  assert.deepEqual(polygonToVertices({ type: 'Polygon', coordinates: [[]] }), [])
})

test('la surface d’aperçu est du bon ordre de grandeur', () => {
  // ~100 m × ~100 m : l'aperçu doit annoncer des milliers de m², pas une
  // fraction de degré carré.
  const aire = approximateArea(CARRE)
  assert.ok(aire > 8_000 && aire < 12_000, `surface hors ordre de grandeur : ${aire}`)
})

test('chaque statut de marché a sa couleur, et l’inconnu ne casse rien', () => {
  const couleurs = ['disponible', 'en_negociation', 'reserve', 'vendu', 'masque'].map(marketColor)
  assert.equal(new Set(couleurs).size, 5, 'deux statuts ne doivent pas partager une couleur')
  couleurs.forEach((c) => assert.match(c, /^#[0-9a-f]{6}$/i))
  assert.match(marketColor(null), /^#[0-9a-f]{6}$/i)
  assert.match(marketColor('inconnu'), /^#[0-9a-f]{6}$/i)
})
