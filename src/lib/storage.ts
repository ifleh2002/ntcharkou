export const LAND_IMAGES_BUCKET = 'land-images'
export const LAND_DOCUMENTS_BUCKET = 'land-documents'
export const PROJECT_DOCUMENTS_BUCKET = 'project-documents'
export const AVATARS_BUCKET = 'avatars'

/**
 * URL publique d'un objet stocke dans un bucket public.
 *
 * Un chemin deja absolu (http/https, ou data:) est renvoye tel quel : les jeux
 * de demonstration et les visuels fournis par l'administration peuvent ainsi
 * pointer ailleurs que sur le stockage Supabase, sans colonne supplementaire.
 */
export function publicStorageUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null

  const trimmed = path.trim()
  if (!trimmed) return null
  if (/^(https?:|data:)/i.test(trimmed)) return trimmed

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')
  if (!base) return null

  // Encodage segment par segment : `encodeURI` laisserait passer « # » et « ? »,
  // qui tronqueraient l'URL au lieu d'etre lus comme des caracteres du nom.
  const encoded = trimmed
    .replace(/^\/+/, '')
    .split('/')
    .map(encodeURIComponent)
    .join('/')

  return `${base}/storage/v1/object/public/${bucket}/${encoded}`
}

export function landImageUrl(path: string | null | undefined) {
  return publicStorageUrl(LAND_IMAGES_BUCKET, path)
}

export function projectImageUrl(path: string | null | undefined) {
  return publicStorageUrl(LAND_IMAGES_BUCKET, path)
}
