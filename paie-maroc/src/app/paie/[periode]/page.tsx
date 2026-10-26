import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Alerte, Badge, Bouton, Card, Lien, PageHeader, Stat, Table } from '@/components/ui'
import { LIBELLES_SITUATION } from '@/lib/exports/cnss'
import { dePeriode, mad } from '@/lib/exports/format'
import { bulletinsDe, totaliser } from '@/lib/paie/agregats'
import { nomComplet, presentSurPeriode } from '@/lib/paie/salarie'
import { lireBase } from '@/lib/store'
import { ajouterSalariePeriode, calculerPeriode, cloturerPeriode, enregistrerGrille, retirerSalariePeriode, rouvrirPeriode, supprimerPeriode } from '../../actions'

const cellule = 'w-14 rounded border border-gray-300 px-1 py-1 text-right text-sm'

export default async function PagePeriode(props: PageProps<'/paie/[periode]'>) {
  const { periode: id } = await props.params
  const db = await lireBase()
  const p = db.periodes.find((x) => x.id === id)
  if (!p) notFound()
  const verrouillee = p.statut === 'CLOTUREE'
  const lignes = Object.entries(p.variables)
    .map(([sid, v]) => ({ s: db.salaries.find((x) => x.id === sid)!, v, b: p.bulletins[sid] }))
    .filter((l) => l.s)
    .sort((a, b) => a.s.matricule.localeCompare(b.s.matricule))
  const absents = db.salaries.filter((s) => !p.variables[s.id] && presentSurPeriode(s, id))
  const t = totaliser(bulletinsDe(p))
  const nonCalcules = lignes.filter((l) => !l.b).length

  return (
    <div className="space-y-6">
      <PageHeader
        titre={`Paie ${dePeriode(id)}`}
        sousTitre={<>Statut : <Badge couleur={p.statut === 'CLOTUREE' ? 'vert' : p.statut === 'CALCULEE' ? 'bleu' : 'orange'}>{p.statut === 'CLOTUREE' ? `Clôturée le ${p.dateCloture}` : p.statut === 'CALCULEE' ? 'Calculée' : 'Ouverte'}</Badge></>}
        actions={
          <>
            {!verrouillee && <form action={calculerPeriode.bind(null, id)}><Bouton type="submit">Calculer la paie</Bouton></form>}
            {p.statut === 'CALCULEE' && <form action={cloturerPeriode.bind(null, id)}><Bouton type="submit" variante="secondaire">Clôturer</Bouton></form>}
            {verrouillee && <form action={rouvrirPeriode.bind(null, id)}><Bouton type="submit" variante="secondaire">Rouvrir</Bouton></form>}
            {t.effectif > 0 && <Lien href={`/paie/${id}/bulletins`}>Imprimer les bulletins</Lien>}
            {t.effectif > 0 && <Lien href={`/declarations/cnss?periode=${id}`}>Déclaration CNSS</Lien>}
            {t.effectif > 0 && <Lien href={`/etats?periode=${id}`}>États de paie</Lien>}
          </>
        }
      />

      {p.statut === 'OUVERTE' && t.effectif > 0 && <Alerte type="attention">Des variables ont été modifiées depuis le dernier calcul : relancez « Calculer la paie ».</Alerte>}
      {nonCalcules > 0 && p.statut !== 'OUVERTE' && <Alerte type="attention">{nonCalcules} salarié(s) sans bulletin calculé.</Alerte>}

      {t.effectif > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Stat label="Brut" valeur={`${mad(t.brut)} DH`} />
          <Stat label="Cotisations salariales" valeur={`${mad(t.cnssSalarial + t.amoSalarial + t.cimrSalarial + t.mutuelleSalarial)} DH`} />
          <Stat label="IR retenu" valeur={`${mad(t.ir)} DH`} />
          <Stat label="Net à payer" valeur={`${mad(t.netAPayer)} DH`} />
          <Stat label="Coût employeur" valeur={`${mad(t.coutEmployeur)} DH`} />
        </div>
      )}

      <Card titre="Variables du mois" actions={<span className="text-xs text-gray-500">Jours payés (26 = mois complet) · HS en heures · avance en DH</span>}>
        <form action={enregistrerGrille.bind(null, id)}>
          <Table>
            <thead>
              <tr>
                <th>Salarié</th><th>Jours payés</th><th>Heures (horaire)</th><th>Absences non payées (j)</th><th>Congés pris (j)</th>
                <th>HS {db.parametres.tauxHeuresSup.hs25}%</th><th>HS {db.parametres.tauxHeuresSup.hs50}%</th><th>HS {db.parametres.tauxHeuresSup.hs100}%</th><th>Avance</th><th>Situation CNSS</th>
                <th className="num">Net à payer</th><th></th>
              </tr>
            </thead>
            <tbody>
              {lignes.map(({ s, v, b }) => {
                const n = (champ: keyof typeof v, disabled = false) => (
                  <input name={`${s.id}.${champ}`} type="number" step="0.01" defaultValue={String(v[champ])} disabled={verrouillee || disabled} className={cellule} />
                )
                return (
                  <tr key={s.id}>
                    <td className="min-w-48">
                      <Link href={`/paie/${id}/saisie/${s.id}`} className="font-medium text-emerald-800 hover:underline">{nomComplet(s)}</Link>
                      <div className="text-xs text-gray-500">{s.matricule} · {s.poste}{v.elements.length > 0 && ` · ${v.elements.length} élément(s) variable(s)`}</div>
                    </td>
                    <td>{n('joursTravailles')}</td>
                    <td>{s.typeSalaire === 'HORAIRE' ? n('heuresTravaillees') : <input type="hidden" name={`${s.id}.heuresTravaillees`} value={v.heuresTravaillees} />}</td>
                    <td>{n('joursAbsenceNonPayee')}</td>
                    <td>{n('joursConges')}</td>
                    <td>{n('hs25')}</td>
                    <td>{n('hs50')}</td>
                    <td>{n('hs100')}</td>
                    <td>{n('avance')}</td>
                    <td>
                      <select name={`${s.id}.situationCnss`} defaultValue={v.situationCnss} disabled={verrouillee} className="w-28 rounded border border-gray-300 px-1 py-1 text-sm">
                        {Object.entries(LIBELLES_SITUATION).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                    </td>
                    <td className="num font-medium">{b ? <Link href={`/paie/${id}/bulletins/${s.id}`} className="text-emerald-800 hover:underline">{mad(b.netAPayer)}</Link> : '-'}</td>
                    <td>
                      {!verrouillee && (
                        <button formAction={retirerSalariePeriode.bind(null, id, s.id)} className="text-xs text-red-700 hover:underline" title="Retirer de la période">Retirer</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
          {!verrouillee && <div className="mt-4"><Bouton type="submit" variante="secondaire">Enregistrer les variables</Bouton></div>}
        </form>
        {!verrouillee && absents.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4 text-sm">
            Salariés présents non inclus :{' '}
            {absents.map((s) => (
              <form key={s.id} action={ajouterSalariePeriode.bind(null, id, s.id)} className="inline">
                <button className="mr-2 rounded border border-gray-300 px-2 py-0.5 hover:bg-gray-50">+ {nomComplet(s)}</button>
              </form>
            ))}
          </div>
        )}
      </Card>

      {!verrouillee && (
        <form action={supprimerPeriode.bind(null, id)}>
          <Bouton variante="danger" type="submit">Supprimer la période</Bouton>
        </form>
      )}
    </div>
  )
}
