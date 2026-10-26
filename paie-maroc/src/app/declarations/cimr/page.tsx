import { Alerte, Card, PageHeader, Stat, Table, Telecharger } from '@/components/ui'
import { lignesCimr } from '@/lib/exports/autres'
import { mad } from '@/lib/exports/format'
import { nomComplet } from '@/lib/paie/salarie'
import { lireBase } from '@/lib/store'

export default async function DeclarationCimr(props: PageProps<'/declarations/cimr'>) {
  const q = (await props.searchParams) as { annee?: string; trimestre?: string }
  const db = await lireBase()
  const derniere = [...db.periodes].sort((a, b) => b.id.localeCompare(a.id))[0]
  const annee = Number(q.annee) || derniere?.annee || new Date().getFullYear()
  const trimestre = Number(q.trimestre) || (derniere ? Math.ceil(derniere.mois / 3) : 1)
  const lignes = lignesCimr(db, annee, trimestre)
  const tot = (k: 'salaire' | 'salarial' | 'patronal') => lignes.reduce((a, l) => a + l[k], 0)
  const annees = [...new Set(db.periodes.map((p) => p.annee))].sort((a, b) => b - a)

  return (
    <div className="space-y-6">
      <PageHeader
        titre="Déclaration CIMR"
        sousTitre={`Caisse interprofessionnelle marocaine de retraite - adhérent ${db.societe.cimrAdherent || 'non renseigné'}`}
        actions={<Telecharger href={`/api/export/cimr?annee=${annee}&trimestre=${trimestre}`}>Bordereau trimestriel (CSV)</Telecharger>}
      />
      <form className="flex gap-2">
        <select name="annee" defaultValue={annee} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm">
          {annees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select name="trimestre" defaultValue={trimestre} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm">
          {[1, 2, 3, 4].map((t) => <option key={t} value={t}>{`T${t} (${['janv.-mars', 'avr.-juin', 'juil.-sept.', 'oct.-déc.'][t - 1]})`}</option>)}
        </select>
        <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">Afficher</button>
      </form>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Affiliés" valeur={lignes.length} />
        <Stat label="Salaires déclarés" valeur={`${mad(tot('salaire'))} DH`} />
        <Stat label="Cotisations salariales" valeur={`${mad(tot('salarial'))} DH`} />
        <Stat label="Total à verser" valeur={`${mad(tot('salarial') + tot('patronal'))} DH`} detail="dans le mois suivant le trimestre" />
      </div>
      {lignes.length === 0 ? (
        <Alerte>Aucun salarié affilié à la CIMR sur ce trimestre.</Alerte>
      ) : (
        <Card titre={`Détail T${trimestre} ${annee}`}>
          <Table>
            <thead><tr><th>Matricule CIMR</th><th>Salarié</th><th className="num">Taux</th><th className="num">Mois 1</th><th className="num">Mois 2</th><th className="num">Mois 3</th><th className="num">Salaire trimestre</th><th className="num">Part salariale</th><th className="num">Part patronale</th></tr></thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.salarie.id}>
                  <td className="font-mono">{l.salarie.numeroCimr}</td>
                  <td>{nomComplet(l.salarie)}</td>
                  <td className="num">{l.salarie.tauxCimr} %</td>
                  {l.detail.map((d, i) => <td key={i} className="num">{mad(d)}</td>)}
                  <td className="num">{mad(l.salaire)}</td>
                  <td className="num">{mad(l.salarial)}</td>
                  <td className="num">{mad(l.patronal)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  )
}
