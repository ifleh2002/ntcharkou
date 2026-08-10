import { getTranslation } from '@/lib/i18n/server'
import { LinkButton } from '@/components/ui'

export default async function NotFound() {
  const { t, path } = await getTranslation()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl" aria-hidden>
        🧭
      </p>
      <h1 className="text-2xl font-bold text-encre-900">404</h1>
      <p className="max-w-md text-encre-500">{t.common.noResult}</p>
      <LinkButton href={path('/')}>{t.common.back}</LinkButton>
    </div>
  )
}
