'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SECTIONS: { titre: string; liens: [string, string][] }[] = [
  { titre: 'Pilotage', liens: [['/', 'Tableau de bord']] },
  { titre: 'Gestion RH', liens: [['/salaries', 'Salariés'], ['/dossiers', 'Dossiers administratifs'], ['/conges', 'Congés']] },
  { titre: 'Production de la paie', liens: [['/paie', 'Périodes de paie'], ['/simulateur', 'Simulateur brut ↔ net']] },
  { titre: 'Déclarations', liens: [['/declarations/cnss', 'CNSS / AMO (Damancom)'], ['/declarations/ir', 'IR (Simpl-IR, 9421)'], ['/declarations/cimr', 'CIMR']] },
  { titre: 'États', liens: [['/etats', 'Journal, virements, comptabilité']] },
  { titre: 'Configuration', liens: [['/societe', 'Société'], ['/rubriques', 'Rubriques de paie'], ['/parametres', 'Paramètres légaux'], ['/sauvegarde', 'Sauvegarde']] },
]

export default function Navigation({ societe }: { societe: string }) {
  const chemin = usePathname()
  const actif = (href: string) => (href === '/' ? chemin === '/' : chemin.startsWith(href))
  return (
    <aside className="no-print w-60 shrink-0 bg-emerald-950 text-emerald-50 md:min-h-screen">
      <div className="border-b border-emerald-900 px-4 py-4">
        <div className="text-lg font-bold tracking-tight">Paie Maroc</div>
        <div className="truncate text-xs text-emerald-300" title={societe}>{societe || 'Société non configurée'}</div>
      </div>
      <nav className="px-2 py-3">
        {SECTIONS.map((s) => (
          <div key={s.titre} className="mb-3">
            <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">{s.titre}</div>
            {s.liens.map(([href, label]) => (
              <Link key={href} href={href} className={`block rounded px-2 py-1.5 text-sm ${actif(href) ? 'bg-emerald-800 text-white' : 'text-emerald-100 hover:bg-emerald-900'}`}>
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
