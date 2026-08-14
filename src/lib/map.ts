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

// -----------------------------------------------------------------------------
// Fonds de carte
// -----------------------------------------------------------------------------

export interface MapLayer {
  id: string
  /** Clé de traduction dans `t.map.layers`. */
  labelKey: 'satellite' | 'relief' | 'topo' | 'plan'
  url: string
  attribution: string
  maxZoom: number
}

/**
 * Fonds disponibles, du plus neutre au plus annoté.
 *
 * L'imagerie satellite et l'ombrage du relief ne tracent aucune frontière
 * politique : ils ne montrent que le terrain. C'est le défaut, parce qu'une
 * frontière contestée n'a pas à être affirmée par une place de marché foncière —
 * et parce que le fond OpenStreetMap en dessinait une au sud du pays.
 *
 * Le fond « plan » reste proposé : il est plus lisible pour se repérer en ville,
 * et l'utilisateur choisit en connaissance de cause.
 */
export const BASE_LAYERS: MapLayer[] = [
  {
    id: 'satellite',
    labelKey: 'satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  {
    id: 'relief',
    labelKey: 'relief',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri',
    maxZoom: 13,
  },
  {
    id: 'topo',
    labelKey: 'topo',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, HERE, Garmin, USGS',
    maxZoom: 19,
  },
  {
    id: 'plan',
    labelKey: 'plan',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  },
]

export interface MapOverlay {
  id: string
  labelKey: 'roads' | 'places'
  url: string
  attribution: string
  maxZoom: number
}

/**
 * Calques additionnels, superposés au fond choisi.
 *
 * Séparés des fonds parce qu'ils se cumulent : on peut vouloir les routes ET
 * les noms de villes sur une image satellite nue.
 */
export const OVERLAYS: MapOverlay[] = [
  {
    id: 'roads',
    labelKey: 'roads',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri',
    maxZoom: 19,
  },
  {
    // ⚠ Ce calque de reference porte les libelles ET les limites
    // administratives : c'est le seul que l'on puisse superposer a une image
    // satellite sans clé d'API. Il est donc propose, mais desactive par defaut
    // — la vue initiale doit rester exempte de frontiere.
    id: 'places',
    labelKey: 'places',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri',
    maxZoom: 19,
  },
]

/** Fond par défaut : celui qui n'affirme aucune frontière. */
export const DEFAULT_LAYER = 'satellite'

/**
 * Vue initiale : imagerie satellite avec les noms de villes.
 *
 * Sans libelles, une image satellite du Maroc est difficile a lire — on ne sait
 * pas ou l'on est. Le calque de reference qui les porte trace aussi, en
 * contrepartie, les limites administratives ; le fond lui-meme n'en trace
 * aucune, et le calque se retire d'un clic depuis le menu.
 */
export const DEFAULT_OVERLAYS: string[] = ['places']

export function findLayer(id: string): MapLayer {
  return BASE_LAYERS.find((layer) => layer.id === id) ?? BASE_LAYERS[0]
}
