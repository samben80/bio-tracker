import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'
import { sessionCourante } from '@/lib/auth'
import { lireBase } from '@/lib/store'
import { infosVersion } from '@/lib/version'

export const metadata: Metadata = {
  title: 'Paie Maroc — Gestion de la paie et des déclarations sociales',
  description: 'Logiciel de paie conforme à la législation marocaine : CNSS, AMO, IR, CIMR, bulletins et télédéclarations.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await sessionCourante()
  if (!session) {
    return (
      <html lang="fr">
        <body className="min-h-screen antialiased">
          <main className="px-4 py-6">{children}</main>
        </body>
      </html>
    )
  }
  const db = await lireBase()
  const v = infosVersion()
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        {v.environnement !== 'production' && (
          <div className="no-print bg-amber-400 px-4 py-1 text-center text-xs font-medium text-amber-950">
            {v.libelleEnvironnement} · {v.libelleVersion} - environnement distinct de la production, ses données ne sont pas celles des utilisateurs
          </div>
        )}
        <div className="flex flex-col md:flex-row">
          <Navigation societe={db.societe.raisonSociale} admin={session.role === 'admin'} version={v.libelleVersion} environnement={v.libelleEnvironnement} />
          <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
        </div>
      </body>
    </html>
  )
}
