import Link from 'next/link'
import { Alerte, Card, PageHeader, Stat, Table, Telecharger } from '@/components/ui'
import SelecteurPeriode from '@/components/SelecteurPeriode'
import { libellePeriode, mad } from '@/lib/exports/format'
import { bulletinsDe, cumulsAnnuels, totaliser } from '@/lib/paie/agregats'
import { nomComplet } from '@/lib/paie/salarie'
import { lireBase } from '@/lib/store'

export default async function DeclarationIr(props: PageProps<'/declarations/ir'>) {
  const q = (await props.searchParams) as { periode?: string; annee?: string }
  const db = await lireBase()
  const calculees = db.periodes.filter((p) => Object.keys(p.bulletins).length).sort((a, b) => b.id.localeCompare(a.id))
  const p = calculees.find((x) => x.id === q.periode) ?? calculees[0]
  const annee = Number(q.annee) || p?.annee || new Date().getFullYear()
  const annees = [...new Set(db.periodes.map((x) => x.annee))].sort((a, b) => b - a)
  const t = totaliser(bulletinsDe(p))
  const cumuls = [...cumulsAnnuels(db, annee).values()]
  const sal = (id: string) => db.salaries.find((s) => s.id === id)!
  const [a, m] = (p?.id ?? '2000-01').split('-').map(Number)
  const echeance = new Date(Date.UTC(a, m + 1, 0)).toLocaleDateString('fr-FR', { timeZone: 'UTC' })

  return (
    <div className="space-y-6">
      <PageHeader titre="Impôt sur le revenu - retenue à la source" sousTitre="Versement mensuel via SIMPL-IR et déclaration annuelle des traitements et salaires (art. 79 du CGI)." />
      {!p ? (
        <Alerte>Aucune paie calculée.</Alerte>
      ) : (
        <>
          <Card titre={`Versement mensuel - ${libellePeriode(p.id)}`} actions={<SelecteurPeriode periodes={calculees} valeur={p.id} />}>
            <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat label="Brut imposable" valeur={`${mad(t.brutImposable)} DH`} />
              <Stat label="Net imposable" valeur={`${mad(t.netImposable)} DH`} />
              <Stat label="IR à verser" valeur={`${mad(t.ir)} DH`} detail={`avant le ${echeance} (SIMPL-IR)`} />
              <Stat label="Salariés imposés" valeur={bulletinsDe(p).filter((b) => b.ir > 0).length} />
            </div>
            <Table>
              <thead><tr><th>Salarié</th><th className="num">Brut imposable</th><th className="num">Frais pro.</th><th className="num">Cotisations</th><th className="num">Net imposable</th><th className="num">IR brut</th><th className="num">Charges fam.</th><th className="num">IR retenu</th></tr></thead>
              <tbody>
                {bulletinsDe(p).map((b) => (
                  <tr key={b.salarieId}>
                    <td><Link href={`/paie/${p.id}/bulletins/${b.salarieId}`} className="text-emerald-800 hover:underline">{nomComplet(sal(b.salarieId))}</Link></td>
                    <td className="num">{mad(b.brutImposable)}</td>
                    <td className="num">{mad(b.fraisProfessionnels)}</td>
                    <td className="num">{mad(b.totalCotisationsSalariales)}</td>
                    <td className="num">{mad(b.netImposable)}</td>
                    <td className="num">{mad(b.irBrut)}</td>
                    <td className="num">{mad(b.deductionsFamille)}</td>
                    <td className="num font-medium">{mad(b.ir)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <Card
            titre={`Déclaration annuelle des traitements et salaires ${annee} (modèle 9421)`}
            actions={
              <div className="flex gap-2">
                <form className="flex gap-2">
                  <select name="annee" defaultValue={annee} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                    {annees.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                  <button className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">Afficher</button>
                </form>
                <Telecharger href={`/api/export/9421?annee=${annee}`}>XML EDI SIMPL-IR</Telecharger>
              </div>
            }
          >
            <Alerte>
              À déposer sur SIMPL-IR avant le 1er mars {annee + 1}. Contrôlez le fichier avec le validateur du portail (XSD en vigueur) et
              complétez le code commune et l&apos;identifiant fiscal dans la fiche Société.
            </Alerte>
            <div className="mt-4">
              <Table>
                <thead><tr><th>Salarié</th><th>CIN</th><th className="num">Mois</th><th className="num">Brut</th><th className="num">Exonéré</th><th className="num">Brut imposable</th><th className="num">Déductions</th><th className="num">Net imposable</th><th className="num">IR prélevé</th></tr></thead>
                <tbody>
                  {cumuls.map((c) => {
                    const s = sal(c.salarieId)
                    return (
                      <tr key={c.salarieId}>
                        <td>{nomComplet(s)}</td>
                        <td className="font-mono">{s.cin}</td>
                        <td className="num">{c.mois}</td>
                        <td className="num">{mad(c.brut)}</td>
                        <td className="num">{mad(c.exonere)}</td>
                        <td className="num">{mad(c.brutImposable)}</td>
                        <td className="num">{mad(c.fraisProfessionnels + c.cotisations + c.interetsLogement)}</td>
                        <td className="num">{mad(c.netImposable)}</td>
                        <td className="num font-medium">{mad(c.ir)}</td>
                      </tr>
                    )
                  })}
                  <tr className="font-semibold">
                    <td colSpan={3}>Total</td>
                    <td className="num">{mad(cumuls.reduce((x, c) => x + c.brut, 0))}</td>
                    <td className="num">{mad(cumuls.reduce((x, c) => x + c.exonere, 0))}</td>
                    <td className="num">{mad(cumuls.reduce((x, c) => x + c.brutImposable, 0))}</td>
                    <td className="num">{mad(cumuls.reduce((x, c) => x + c.fraisProfessionnels + c.cotisations + c.interetsLogement, 0))}</td>
                    <td className="num">{mad(cumuls.reduce((x, c) => x + c.netImposable, 0))}</td>
                    <td className="num">{mad(cumuls.reduce((x, c) => x + c.ir, 0))}</td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
