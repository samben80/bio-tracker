import Link from 'next/link'
import { Badge, Bouton, Card, Champ, Input, PageHeader, Table } from '@/components/ui'
import { libellePeriode, mad } from '@/lib/exports/format'
import { bulletinsDe, totaliser } from '@/lib/paie/agregats'
import { lireBase } from '@/lib/store'
import { ouvrirPeriode } from '../actions'

const STATUTS = { OUVERTE: ['orange', 'Ouverte - saisie en cours'], CALCULEE: ['bleu', 'Calculée'], CLOTUREE: ['vert', 'Clôturée'] } as const

export default async function PagePaie() {
  const db = await lireBase()
  const periodes = [...db.periodes].sort((a, b) => b.id.localeCompare(a.id))
  const derniere = periodes[0]
  const suivante = derniere
    ? new Date(Date.UTC(derniere.annee, derniere.mois, 1)).toISOString().slice(0, 7)
    : new Date().toISOString().slice(0, 7)

  return (
    <div className="space-y-6">
      <PageHeader titre="Périodes de paie" sousTitre="Ouverture, saisie des variables, calcul, contrôle et clôture mensuelle." />
      <Card titre="Ouvrir une nouvelle période">
        <form action={ouvrirPeriode} className="flex flex-wrap items-end gap-3">
          <Champ label="Mois de paie"><Input type="month" name="periode" defaultValue={suivante} required /></Champ>
          <Bouton type="submit">Ouvrir la période</Bouton>
          <p className="text-xs text-gray-500">Les salariés présents sur le mois sont repris avec leurs éléments fixes.</p>
        </form>
      </Card>
      <Card titre="Historique">
        <Table>
          <thead>
            <tr><th>Période</th><th>Statut</th><th className="num">Bulletins</th><th className="num">Brut</th><th className="num">Net à payer</th><th className="num">IR</th><th className="num">Coût employeur</th></tr>
          </thead>
          <tbody>
            {periodes.map((p) => {
              const t = totaliser(bulletinsDe(p))
              const [c, l] = STATUTS[p.statut]
              return (
                <tr key={p.id}>
                  <td><Link href={`/paie/${p.id}`} className="font-medium text-emerald-800 hover:underline">{libellePeriode(p.id)}</Link></td>
                  <td><Badge couleur={c}>{l}</Badge></td>
                  <td className="num">{t.effectif} / {Object.keys(p.variables).length}</td>
                  <td className="num">{mad(t.brut)}</td>
                  <td className="num">{mad(t.netAPayer)}</td>
                  <td className="num">{mad(t.ir)}</td>
                  <td className="num">{mad(t.coutEmployeur)}</td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
