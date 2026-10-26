import Link from 'next/link'
import { Badge, Card, PageHeader, Table } from '@/components/ui'
import { TYPES_DOCUMENTS } from '@/lib/paie/defaults'
import { nomComplet } from '@/lib/paie/salarie'
import { lireBase } from '@/lib/store'

const ESSENTIELS = TYPES_DOCUMENTS.slice(0, 4)

export default async function PageDossiers() {
  const db = await lireBase()
  const aujourdhui = new Date().toISOString().slice(0, 10)
  const actifs = db.salaries.filter((s) => s.actif).sort((a, b) => a.matricule.localeCompare(b.matricule))
  return (
    <div className="space-y-6">
      <PageHeader titre="Dossiers administratifs" sousTitre="Complétude des dossiers du personnel et pièces arrivant à expiration." />
      <Card>
        <Table>
          <thead><tr><th>Salarié</th>{ESSENTIELS.map((t) => <th key={t}>{t}</th>)}<th className="num">Pièces</th><th>Alertes</th></tr></thead>
          <tbody>
            {actifs.map((s) => {
              const expirees = s.documents.filter((d) => d.dateExpiration && d.dateExpiration < aujourdhui && d.type !== 'Contrat de travail')
              const manquantes = s.documents.filter((d) => d.statut !== 'FOURNI')
              return (
                <tr key={s.id}>
                  <td><Link href={`/salaries/${s.id}#dossier`} className="text-emerald-800 hover:underline">{nomComplet(s)}</Link></td>
                  {ESSENTIELS.map((t) => {
                    const d = s.documents.find((x) => x.type === t)
                    return <td key={t}>{!d ? <Badge couleur="gris">Non répertorié</Badge> : d.statut === 'FOURNI' ? <Badge couleur="vert">Fourni</Badge> : <Badge couleur="rouge">{d.statut === 'MANQUANT' ? 'Manquant' : 'À renouveler'}</Badge>}</td>
                  })}
                  <td className="num">{s.documents.length}</td>
                  <td className="text-sm">
                    {expirees.map((d) => <div key={d.id} className="text-red-700">{d.type} expiré</div>)}
                    {manquantes.map((d) => <div key={d.id} className="text-amber-700">{d.type} {d.statut === 'MANQUANT' ? 'manquant' : 'à renouveler'}</div>)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
