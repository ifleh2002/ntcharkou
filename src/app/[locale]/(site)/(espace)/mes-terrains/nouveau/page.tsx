import type { Metadata } from 'next'
import { LandForm } from '@/components/land-form'
import { Alert } from '@/components/ui'
import { requireSession } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n'
import { resolveLocale, translation } from '@/lib/i18n/server'
import { getCities, getRegions } from '@/lib/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { OwnerKind } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: getDictionary(resolveLocale(locale)).landForm.title }
}

export default async function NouveauTerrainPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const { t } = translation(locale)

  const session = await requireSession('/mes-terrains/nouveau')
  const supabase = await createSupabaseServerClient()

  const [regions, cities, ownerProfile] = await Promise.all([
    getRegions(locale),
    getCities(locale),
    supabase
      .from('owner_profiles')
      .select('owner_kind')
      .eq('profile_id', session.userId)
      .maybeSingle(),
  ])

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-encre-900">{t.landForm.title}</h1>
        <p className="mt-2 max-w-2xl text-encre-500">{t.landForm.lead}</p>
      </header>

      <div className="mb-6">
        <Alert tone="info" title={t.landForm.privateTitle}>
          {t.landForm.privateBody}
        </Alert>
      </div>

      <LandForm
        regions={regions}
        cities={cities}
        profile={session.profile}
        ownerKind={(ownerProfile.data?.owner_kind as OwnerKind) ?? 'particulier'}
        t={t}
        locale={locale}
      />
    </div>
  )
}
