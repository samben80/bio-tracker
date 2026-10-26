import Link from 'next/link'
import { Card, PageHeader, Table } from '@/components/ui'
import { dateFr } from '@/lib/exports/format'
import { soldeConges } from '@/lib/paie/agregats'
import { anneesRevolues, congesAcquisMensuels } from '@/lib/paie/calcul'
import { nomComplet } from '@/lib/paie/salarie'
import { lireBase } from '@/lib/store'

export default async function PageConges() {
  const db = await lireBase()
  const maintenant = new Date()
  const actifs = db.salaries.filter((s) => s.actif).sort((a, b) => a.matricule.localeCompare(b.matricule))
  return (
    <div className="space-y-6">
      <PageHeader titre="Congés payés" sousTitre="Acquisition de 1,5 jour ouvrable par mois de service (2 jours pour les moins de 18 ans), majorée de 1,5 jour par période de 5 ans d'ancienneté, dans la limite de 30 jours (art. 231 et 241)." />
      <Card>
        <Table>
          <thead><tr><th>Salarié</th><th>Ancienneté depuis</th><th className="num">Années</th><th className="num">Droit mensuel</th><th className="num">Reliquat initial</th><th className="num">Acquis</th><th className="num">Pris</th><th className="num">Solde</th></tr></thead>
          <tbody>
            {actifs.map((s) => {
              const c = soldeConges(db, s.id)
              return (
                <tr key={s.id}>
                  <td><Link href={`/salaries/${s.id}`} className="text-emerald-800 hover:underline">{nomComplet(s)}</Link></td>
                  <td>{dateFr(s.dateAnciennete || s.dateEmbauche)}</td>
                  <td className="num">{anneesRevolues(s.dateAnciennete || s.dateEmbauche, maintenant)}</td>
                  <td className="num">{congesAcquisMensuels(s, maintenant).toFixed(2)} j</td>
                  <td className="num">{s.soldeCongesInitial}</td>
                  <td className="num">{c.acquis.toFixed(2)}</td>
                  <td className="num">{c.pris}</td>
                  <td className={`num font-medium ${c.solde < 0 ? 'text-red-700' : ''}`}>{c.solde.toFixed(2)} j</td>
                </tr>
              )
            })}
          </tbody>
        </Table>
        <p className="mt-3 text-xs text-gray-500">Les congés pris se saisissent dans les variables de chaque période de paie. Ils restent rémunérés (salaire maintenu).</p>
      </Card>
    </div>
  )
}
