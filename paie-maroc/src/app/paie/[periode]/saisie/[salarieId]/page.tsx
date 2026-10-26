import { notFound } from 'next/navigation'
import EditeurElements from '@/components/EditeurElements'
import { Alerte, Bouton, Card, Champ, Input, Lien, PageHeader, Select, Table } from '@/components/ui'
import { LIBELLES_SITUATION } from '@/lib/exports/cnss'
import { dePeriode, mad } from '@/lib/exports/format'
import { variablesParDefaut } from '@/lib/paie/calcul'
import { nomComplet } from '@/lib/paie/salarie'
import { lireBase } from '@/lib/store'
import { enregistrerVariablesSalarie } from '../../../../actions'

export default async function SaisieSalarie(props: PageProps<'/paie/[periode]/saisie/[salarieId]'>) {
  const { periode: id, salarieId } = await props.params
  const db = await lireBase()
  const p = db.periodes.find((x) => x.id === id)
  const s = db.salaries.find((x) => x.id === salarieId)
  if (!p || !s) notFound()
  const v = p.variables[s.id] ?? variablesParDefaut(s, db.parametres, id)
  const hs = db.parametres.tauxHeuresSup
  const rubrique = (code: string) => db.rubriques.find((r) => r.code === code)

  return (
    <div className="space-y-6">
      <PageHeader titre={`Saisie - ${nomComplet(s)}`} sousTitre={`Paie ${dePeriode(id)} · matricule ${s.matricule}`} actions={<Lien href={`/paie/${id}`}>Retour à la période</Lien>} />
      {p.statut === 'CLOTUREE' && <Alerte type="erreur">Période clôturée : saisie impossible.</Alerte>}
      <form action={enregistrerVariablesSalarie.bind(null, id, s.id)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card titre="Temps de travail et absences">
            <div className="grid gap-3 sm:grid-cols-3">
              <Champ label="Jours payés" aide="26 = mois complet ; prorata en cas d'entrée/sortie"><Input name="joursTravailles" type="number" step="0.5" defaultValue={v.joursTravailles} /></Champ>
              <Champ label="Heures travaillées" aide="Salariés horaires uniquement"><Input name="heuresTravaillees" type="number" step="0.5" defaultValue={v.heuresTravaillees} /></Champ>
              <Champ label="Absences non rémunérées (j)"><Input name="joursAbsenceNonPayee" type="number" step="0.5" defaultValue={v.joursAbsenceNonPayee} /></Champ>
              <Champ label="Congés payés pris (j)"><Input name="joursConges" type="number" step="0.5" defaultValue={v.joursConges} /></Champ>
              <Champ label="Situation CNSS">
                <Select name="situationCnss" defaultValue={v.situationCnss} options={Object.entries(LIBELLES_SITUATION)} />
              </Champ>
            </div>
          </Card>
          <Card titre="Heures supplémentaires (art. 201 du Code du travail)">
            <div className="grid gap-3 sm:grid-cols-3">
              <Champ label={`Majorées à ${hs.hs25} %`} aide="Jour ouvrable, 6h-21h"><Input name="hs25" type="number" step="0.5" defaultValue={v.hs25} /></Champ>
              <Champ label={`Majorées à ${hs.hs50} %`} aide="Nuit ou jour de repos de jour"><Input name="hs50" type="number" step="0.5" defaultValue={v.hs50} /></Champ>
              <Champ label={`Majorées à ${hs.hs100} %`} aide="Nuit d'un jour de repos"><Input name="hs100" type="number" step="0.5" defaultValue={v.hs100} /></Champ>
            </div>
          </Card>
          <Card titre="Éléments variables du mois">
            <EditeurElements prefixe="ev" rubriques={db.rubriques.filter((r) => r.actif)} initial={v.elements} />
          </Card>
          <Card titre="Acomptes et éléments fixes">
            <Champ label="Avance sur salaire (DH)"><Input name="avance" type="number" step="0.01" defaultValue={v.avance} /></Champ>
            <div className="mt-4 text-sm font-medium text-gray-700">Éléments fixes repris de la fiche salarié</div>
            <Table>
              <tbody>
                {s.elementsFixes.map((e) => (
                  <tr key={e.code}><td className="font-mono">{e.code}</td><td>{rubrique(e.code)?.libelle ?? 'Rubrique inconnue'}</td><td className="num">{mad(e.montant)}</td></tr>
                ))}
                {s.elementsFixes.length === 0 && <tr><td className="text-gray-500">Aucun</td></tr>}
              </tbody>
            </Table>
          </Card>
        </div>
        {p.statut !== 'CLOTUREE' && <Bouton type="submit">Enregistrer et calculer le bulletin</Bouton>}
      </form>
    </div>
  )
}
