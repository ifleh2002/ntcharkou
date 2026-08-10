import { getTranslation } from '@/lib/i18n/server'
import { isSupabaseConfigured } from '@/lib/supabase/server'

/**
 * Bandeau affiché tant que la connexion Supabase n'est pas configurée : évite
 * une page blanche incompréhensible au premier lancement.
 */
export async function SetupNotice() {
  if (isSupabaseConfigured()) return null
  const { t } = await getTranslation()

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
      <strong className="font-semibold">{t.common.setupRequired}</strong> {t.common.setupBody}
    </div>
  )
}
