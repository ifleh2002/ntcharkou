export const LAND_IMAGES_BUCKET = 'land-images'
export const LAND_DOCUMENTS_BUCKET = 'land-documents'
export const PROJECT_DOCUMENTS_BUCKET = 'project-documents'
export const AVATARS_BUCKET = 'avatars'

/** URL publique d'un objet stocke dans un bucket public. */
export function publicStorageUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base}/storage/v1/object/public/${bucket}/${encodeURI(path)}`
}

export function landImageUrl(path: string | null | undefined) {
  return publicStorageUrl(LAND_IMAGES_BUCKET, path)
}
