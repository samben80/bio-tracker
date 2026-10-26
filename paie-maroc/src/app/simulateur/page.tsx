import { Bouton, Card, Champ, Input, PageHeader, Select, Stat, Table } from '@/components/ui'
import { mad } from '@/lib/exports/format'
import { calculerBulletin, salaireBasePourNet, variablesParDefaut } from '@/lib/paie/calcul'
import { nouveauSalarie } from '@/lib/paie/salarie'
import { lireBase } from '@/lib/store'

export default async function Simulateur(props: PageProps<'/simulateur'>) {
  const q = (await props.searchParams) as Record<string, string | undefined>
  const db = await lireBase()
  const n = (k: string, d: number) => (q[k] !== undefined && q[k] !== '' ? Number(q[k]) : d)
  const mode = q.mode === 'net' ? 'net' : 'brut'
  const montant = n('montant', 10000)
  const anciennete = n('anciennete', 0)
  const transport = n('transport', 0)
  const periode = new Date().toISOString().slice(0, 7)
  const [a, m] = periode.split('-').map(Number)
  const dateAnc = new Date(Date.UTC(a - anciennete, m - 1, 1)).toISOString().slice(0, 10)

  const s = {
    ...nouveauSalarie(),
    id: 'simulation',
    nom: 'Simulation',
    prenom: '',
    dateEmbauche: dateAnc,
    dateAnciennete: dateAnc,
    personnesACharge: n('pac', 0),
    affilieCimr: n('cimr', 0) > 0,
    tauxCimr: n('cimr', 0),
    tauxMutuelleSalarial: n('mutuelle', 0),
    elementsFixes: transport ? [{ code: '300', montant: transport }] : [],
  }
  s.salaireBase = mode === 'net' ? salaireBasePourNet(montant, s, db.parametres, db.rubriques, periode) : montant
  const b = calculerBulletin(s, variablesParDefaut(s, db.parametres), periode, db.parametres, db.rubriques)
  const tauxEffectif = b.brut ? (b.ir / b.brut) * 100 : 0

  return (
    <div className="space-y-6">
      <PageHeader titre="Simulateur de salaire" sousTitre="Brut → net et net → brut avec les paramètres légaux en vigueur dans le dossier." />
      <Card>
        <form className="grid gap-3 md:grid-cols-4 lg:grid-cols-8">
          <Champ label="Calcul"><Select name="mode" defaultValue={mode} options={[['brut', 'Du salaire de base au net'], ['net', 'Du net au salaire de base']]} /></Champ>
          <Champ label={mode === 'net' ? 'Net souhaité (DH)' : 'Salaire de base (DH)'}><Input name="montant" type="number" step="0.01" defaultValue={montant} /></Champ>
          <Champ label="Ancienneté (ans)"><Input name="anciennete" type="number" defaultValue={anciennete} /></Champ>
          <Champ label="Personnes à charge"><Input name="pac" type="number" min={0} max={6} defaultValue={s.personnesACharge} /></Champ>
          <Champ label="CIMR salariale %"><Input name="cimr" type="number" step="0.25" defaultValue={s.tauxCimr || 0} /></Champ>
          <Champ label="Mutuelle %"><Input name="mutuelle" type="number" step="0.1" defaultValue={s.tauxMutuelleSalarial} /></Champ>
          <Champ label="Indemnité transport"><Input name="transport" type="number" defaultValue={transport} /></Champ>
          <div className="self-end"><Bouton type="submit">Simuler</Bouton></div>
        </form>
      </Card>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Salaire de base" valeur={`${mad(s.salaireBase)} DH`} />
        <Stat label="Brut" valeur={`${mad(b.brut)} DH`} />
        <Stat label="Net à payer" valeur={`${mad(b.netAPayer)} DH`} detail={`${b.brut ? ((b.netAPayer / b.brut) * 100).toFixed(1) : 0} % du brut`} />
        <Stat label="IR" valeur={`${mad(b.ir)} DH`} detail={`taux effectif ${tauxEffectif.toFixed(2)} %`} />
        <Stat label="Coût employeur" valeur={`${mad(b.coutEmployeur)} DH`} detail={`${mad(b.coutEmployeur * 12)} DH / an`} />
      </div>
      <Card titre="Détail du calcul">
        <Table>
          <thead><tr><th>Rubrique</th><th className="num">Base</th><th className="num">Taux</th><th className="num">Gain</th><th className="num">Retenue</th><th className="num">Patronal</th></tr></thead>
          <tbody>
            {b.lignes.map((l, i) => (
              <tr key={i}><td>{l.libelle}</td><td className="num">{l.base ? mad(l.base) : ''}</td><td className="num">{l.taux ?? ''}</td><td className="num">{l.gain ? mad(l.gain) : ''}</td><td className="num">{l.retenue ? mad(l.retenue) : ''}</td><td className="num">{l.patronal ? mad(l.patronal) : ''}</td></tr>
            ))}
            <tr className="text-gray-600"><td>Frais professionnels déduits</td><td></td><td></td><td></td><td className="num">{mad(b.fraisProfessionnels)}</td><td></td></tr>
            <tr className="text-gray-600"><td>Net imposable</td><td className="num">{mad(b.netImposable)}</td><td></td><td></td><td></td><td></td></tr>
            <tr className="text-gray-600"><td>Déduction charges de famille</td><td></td><td></td><td></td><td className="num">{mad(b.deductionsFamille)}</td><td></td></tr>
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
