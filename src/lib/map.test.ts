/**
 * Conversions cartographiques — cas limites.
 *   node --experimental-strip-types --test src/lib/map.test.ts
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BASE_LAYERS,
  DEFAULT_LAYER,
  DEFAULT_OVERLAYS,
  OVERLAYS,
  approximateArea,
  cellSize,
  clusterPoints,
  findLayer,
  marketColor,
  polygonToVertices,
  verticesToPolygon,
} from './map.ts'

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

test('le fond par défaut ne trace aucune frontière politique', () => {
  // C'est la demande explicite : le fond initial est de l'imagerie, pas une
  // carte politique. Un changement de défaut doit casser ce test.
  const defaut = findLayer(DEFAULT_LAYER)
  assert.equal(defaut.id, 'satellite')
  assert.match(defaut.url, /World_Imagery/)
})

test('chaque fond et calque est utilisable sans clé d’API', () => {
  for (const layer of [...BASE_LAYERS, ...OVERLAYS]) {
    assert.match(layer.url, /^https:\/\//, `${layer.id} doit être servi en HTTPS`)
    // Une URL réclamant une clé nous rendrait dépendants d'un compte à
    // provisionner, et la carte tomberait le jour où le quota est atteint.
    assert.doesNotMatch(layer.url, /api_key|apikey|access_token|\{key\}/i, `${layer.id}`)
    assert.ok(layer.attribution.length > 0, `${layer.id} doit citer sa source`)
    assert.ok(layer.maxZoom >= 12, `${layer.id} doit permettre de zoomer utilement`)
  }
})

test('les identifiants de fonds sont uniques et le défaut existe', () => {
  const ids = BASE_LAYERS.map((l) => l.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.includes(DEFAULT_LAYER))
  DEFAULT_OVERLAYS.forEach((id) => assert.ok(OVERLAYS.some((o) => o.id === id)))
})

test('la vue initiale est satellite avec les noms de villes', () => {
  // Une image satellite sans libellés est illisible : on ne sait pas où l'on
  // est. Le fond, lui, ne trace aucune frontière.
  assert.equal(DEFAULT_LAYER, 'satellite')
  assert.deepEqual(DEFAULT_OVERLAYS, ['places'])
})

test('un identifiant inconnu retombe sur un fond valide', () => {
  assert.ok(findLayer('inexistant').url.startsWith('https://'))
})

// --- Regroupement par zoom ---------------------------------------------------

const POINTS = [
  { id: 'a', lat: 33.5731, lng: -7.5898 }, // Casablanca
  { id: 'b', lat: 33.5750, lng: -7.5910 }, // Casablanca, 200 m plus loin
  { id: 'c', lat: 34.0209, lng: -6.8416 }, // Rabat
  { id: 'd', lat: 31.6295, lng: -7.9811 }, // Marrakech
]

test('à l’échelle du pays, les points proches forment un seul groupe', () => {
  const clusters = clusterPoints(POINTS, 5)
  assert.ok(clusters.length < POINTS.length, 'le regroupement doit réduire le nombre de disques')
  const total = clusters.reduce((sum, c) => sum + c.items.length, 0)
  assert.equal(total, POINTS.length, 'aucun point ne doit être perdu')
})

test('zoomer sépare les groupes jusqu’à l’élément unique', () => {
  const counts = [4, 6, 8, 10, 13].map((z) => clusterPoints(POINTS, z).length)
  // Le nombre de disques croît, ou reste stable — il ne doit jamais décroître.
  counts.forEach((n, i) => {
    if (i > 0) assert.ok(n >= counts[i - 1], `zoom ${i} : ${n} < ${counts[i - 1]}`)
  })
  assert.equal(counts[counts.length - 1], POINTS.length, 'au détail, un disque par point')
})

test('le disque se pose sur ses membres, pas sur la grille', () => {
  // Deux points assez proches pour tomber dans la même cellule au zoom 5.
  const clusters = clusterPoints(
    [
      { id: 'a', lat: 33.55, lng: -7.6 },
      { id: 'b', lat: 33.65, lng: -7.55 },
    ],
    5,
  )
  assert.equal(clusters.length, 1, 'ces deux points doivent partager une cellule')
  // La moyenne, et non le coin de la grille : un disque doit se poser sur ce
  // qu'il représente.
  assert.ok(Math.abs(clusters[0].lat - 33.6) < 1e-9)
  assert.ok(Math.abs(clusters[0].lng - -7.575) < 1e-9)
})

test('aucun point n’est perdu, quel que soit le zoom', () => {
  for (const zoom of [0, 3, 5, 7, 9, 11, 13, 16]) {
    const total = clusterPoints(POINTS, zoom).reduce((sum, c) => sum + c.items.length, 0)
    assert.equal(total, POINTS.length, `zoom ${zoom}`)
  }
  assert.deepEqual(clusterPoints([], 5), [])
})

test('la cellule rétrécit quand le zoom augmente', () => {
  assert.ok(cellSize(6) < cellSize(5))
  assert.ok(cellSize(12) < cellSize(6))
  assert.ok(cellSize(5) > 0)
})
