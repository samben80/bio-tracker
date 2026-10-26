import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'
import { lireBase } from '@/lib/store'

export const metadata: Metadata = {
  title: 'Paie Maroc — Gestion de la paie et des déclarations sociales',
  description: 'Logiciel de paie conforme à la législation marocaine : CNSS, AMO, IR, CIMR, bulletins et télédéclarations.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const db = await lireBase()
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        <div className="flex flex-col md:flex-row">
          <Navigation societe={db.societe.raisonSociale} />
          <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
        </div>
      </body>
    </html>
  )
}
