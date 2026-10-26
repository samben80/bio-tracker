import Link from 'next/link'
import { Badge, Card, Lien, PageHeader, Table } from '@/components/ui'
import { dateFr, mad } from '@/lib/exports/format'
import { LIBELLES_CONTRAT } from '@/lib/paie/libelles'
import { nomComplet } from '@/lib/paie/salarie'
import { lireBase } from '@/lib/store'

export default async function PageSalaries(props: PageProps<'/salaries'>) {
  const { q = '', statut = 'actifs' } = (await props.searchParams) as { q?: string; statut?: string }
  const db = await lireBase()
  const recherche = q.toLowerCase()
  const liste = db.salaries
    .filter((s) => (statut === 'tous' ? true : statut === 'sortis' ? !s.actif : s.actif))
    .filter((s) => !recherche || `${s.nom} ${s.prenom} ${s.matricule} ${s.cin} ${s.poste} ${s.departement}`.toLowerCase().includes(recherche))
    .sort((a, b) => a.matricule.localeCompare(b.matricule))

  return (
    <div className="space-y-6">
      <PageHeader titre="Salariés" sousTitre={`${db.salaries.filter((s) => s.actif).length} salariés actifs`} actions={<Lien href="/salaries/nouveau" variante="primaire">Nouveau salarié</Lien>} />
      <Card>
        <form className="mb-4 flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="Rechercher (nom, matricule, CIN, poste…)" className="w-72 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm" />
          <select name="statut" defaultValue={statut} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm">
            <option value="actifs">Actifs</option>
            <option value="sortis">Sortis</option>
            <option value="tous">Tous</option>
          </select>
          <button className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">Filtrer</button>
        </form>
        <Table>
          <thead>
            <tr><th>Matricule</th><th>Nom et prénom</th><th>Poste</th><th>Contrat</th><th>Embauche</th><th>N° CNSS</th><th className="num">Salaire de base</th><th></th></tr>
          </thead>
          <tbody>
            {liste.map((s) => (
              <tr key={s.id}>
                <td className="font-mono">{s.matricule}</td>
                <td><Link href={`/salaries/${s.id}`} className="font-medium text-emerald-800 hover:underline">{nomComplet(s)}</Link></td>
                <td>{s.poste}<div className="text-xs text-gray-500">{s.departement}</div></td>
                <td><Badge couleur={s.typeContrat === 'CDI' ? 'vert' : 'orange'}>{LIBELLES_CONTRAT[s.typeContrat]}</Badge></td>
                <td>{dateFr(s.dateEmbauche)}{s.dateSortie && <div className="text-xs text-red-700">Sorti le {dateFr(s.dateSortie)}</div>}</td>
                <td className="font-mono">{s.numeroCnss || <span className="text-red-600">manquant</span>}</td>
                <td className="num">{s.typeSalaire === 'HORAIRE' ? `${mad(s.salaireBase)} DH/h` : `${mad(s.salaireBase)} DH`}</td>
                <td><Link href={`/salaries/${s.id}`} className="text-emerald-800 hover:underline">Fiche</Link></td>
              </tr>
            ))}
            {liste.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-gray-500">Aucun salarié.</td></tr>}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
