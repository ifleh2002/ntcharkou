import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { SetupNotice } from '@/components/setup-notice'

/**
 * L'en-tête dépend de la session (notifications, menu) : le rendu doit rester
 * dynamique, y compris quand les variables Supabase sont absentes au build.
 */
export const dynamic = 'force-dynamic'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <SetupNotice />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
