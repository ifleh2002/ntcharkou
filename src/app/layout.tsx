import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Ntcharkou — Construisons ensemble les logements de demain',
    template: '%s · Ntcharkou',
  },
  description:
    "Place de marché du logement participatif au Maroc : terrains disponibles, demandes des " +
    'participants, groupes de projet et validation administrative.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
