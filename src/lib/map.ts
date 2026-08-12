/**
 * Conventions cartographiques, partagées par la carte publique et l'éditeur.
 * Module pur : aucune dépendance, donc testable seul.
 */

export type LandMarketStatus =
  | 'disponible'
  | 'en_negociation'
  | 'reserve'
  | 'vendu'
  | 'masque'

/**
 * Couleur d'un terrain selon son statut de marché.
 *
 * Le statut de marché est distinct du statut de publication : un terrain publié
 * peut être disponible, en négociation ou vendu. Ce sont deux axes différents,
 * et c'est le premier qui se lit sur la carte.
 */
export const MARKET_COLORS: Record<LandMarketStatus, string> = {
  disponible: '#1f6b5a', // zellige — libre
  en_negociation: '#e0ae4e', // safran — discussion en cours
  reserve: '#2563eb', // bleu — engagé
  vendu: '#c2603b', // argile — conclu
  masque: '#7a736b', // encre clair — à vérifier
}

export const MARKET_STATUS_ORDER: LandMarketStatus[] = [
  'disponible',
  'en_negociation',
  'reserve',
  'vendu',
  'masque',
]

export function marketColor(status: string | null | undefined): string {
  return MARKET_COLORS[(status ?? 'disponible') as LandMarketStatus] ?? MARKET_COLORS.disponible
}

/** Polygone GeoJSON tel que publié par la vue et attendu par PostGIS. */
export interface GeoPolygon {
  type: 'Polygon'
  /** Anneau extérieur : [longitude, latitude], premier point répété en dernier. */
  coordinates: [number, number][][]
}

/** Vue cadrée sur le Maroc, point de départ quand rien n'est encore situé. */
export const MOROCCO_CENTER: [number, number] = [31.7917, -7.0926]
export const MOROCCO_ZOOM = 5

/**
 * Convertit une suite de sommets cliqués en polygone GeoJSON.
 *
 * Deux pièges que la carte ne signale pas d'elle-même :
 *   - Leaflet manipule des [latitude, longitude], GeoJSON des
 *     [longitude, latitude]. L'ordre inversé placerait les parcelles
 *     marocaines quelque part en Somalie, sans erreur visible.
 *   - GeoJSON exige un anneau fermé : le premier sommet doit être répété en
 *     dernier, sinon PostGIS refuse la géométrie.
 *
 * Renvoie `null` en dessous de trois sommets : deux points ne délimitent pas
 * une surface.
 */
export function verticesToPolygon(vertices: [number, number][]): GeoPolygon | null {
  if (vertices.length < 3) return null

  const ring: [number, number][] = vertices.map(([lat, lng]) => [lng, lat])
  const [firstLng, firstLat] = ring[0]
  const [lastLng, lastLat] = ring[ring.length - 1]
  if (firstLng !== lastLng || firstLat !== lastLat) ring.push([firstLng, firstLat])

  return { type: 'Polygon', coordinates: [ring] }
}

/** Chemin inverse : du GeoJSON stocké aux sommets attendus par Leaflet. */
export function polygonToVertices(polygon: GeoPolygon | null | undefined): [number, number][] {
  const ring = polygon?.coordinates?.[0]
  if (!ring || ring.length < 4) return []

  // On retire le point de fermeture, qui répète le premier sommet.
  return ring.slice(0, -1).map(([lng, lat]) => [lat, lng] as [number, number])
}

/**
 * Surface approximative d'un polygone, en m².
 *
 * Sert d'aperçu pendant le tracé. La valeur qui fait foi reste celle calculée
 * par PostGIS à l'enregistrement : c'est elle qui est stockée et affichée.
 */
export function approximateArea(vertices: [number, number][]): number {
  if (vertices.length < 3) return 0

  const R = 6_378_137 // rayon équatorial WGS 84, en mètres
  const toRad = (deg: number) => (deg * Math.PI) / 180

  let total = 0
  for (let i = 0; i < vertices.length; i += 1) {
    const [lat1, lng1] = vertices[i]
    const [lat2, lng2] = vertices[(i + 1) % vertices.length]
    total += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)))
  }

  return Math.abs((total * R * R) / 2)
}
