import { isSupabaseConfigured } from '@/lib/supabase/server'

/**
 * Bandeau affiche tant que la connexion Supabase n'est pas configuree : evite
 * une page blanche incomprehensible au premier lancement.
 */
export function SetupNotice() {
  if (isSupabaseConfigured()) return null

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
      <strong className="font-semibold">Configuration requise —</strong> copiez{' '}
      <code className="rounded bg-amber-100 px-1">.env.example</code> vers{' '}
      <code className="rounded bg-amber-100 px-1">.env.local</code>, renseignez vos clés Supabase et
      appliquez les migrations de <code className="rounded bg-amber-100 px-1">supabase/migrations</code>.
    </div>
  )
}
