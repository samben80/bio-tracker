import BoutonImprimer from '@/components/BoutonImprimer'
import SelecteurPeriode from '@/components/SelecteurPeriode'
import { Alerte, Card, PageHeader, Table, Telecharger } from '@/components/ui'
import { ecrituresComptables } from '@/lib/exports/autres'
import { dePeriode, libellePeriode, mad } from '@/lib/exports/format'
import { bulletinsDe, totaliser } from '@/lib/paie/agregats'
import { round2 } from '@/lib/paie/calcul'
import { nomComplet } from '@/lib/paie/salarie'
import { lireBase } from '@/lib/store'

export default async function PageEtats(props: PageProps<'/etats'>) {
  const q = (await props.searchParams) as { periode?: string }
  const db = await lireBase()
  const calculees = db.periodes.filter((p) => Object.keys(p.bulletins).length)
  const p = calculees.find((x) => x.id === q.periode) ?? [...calculees].sort((a, b) => b.id.localeCompare(a.id))[0]
  if (!p) return <Alerte>Aucune paie calculée.</Alerte>
  const lignes = bulletinsDe(p)
    .map((b) => ({ b, s: db.salaries.find((x) => x.id === b.salarieId)! }))
    .filter((l) => l.s)
    .sort((a, b) => a.s.matricule.localeCompare(b.s.matricule))
  const t = totaliser(bulletinsDe(p))
  const ecritures = ecrituresComptables(p)

  // Récapitulatif par rubrique
  const recap = new Map<string, { libelle: string; gain: number; retenue: number; patronal: number }>()
  for (const { b } of lignes) {
    for (const l of b.lignes) {
      const r = recap.get(l.code) ?? { libelle: l.code === '120' ? 'Prime d\'ancienneté' : l.libelle, gain: 0, retenue: 0, patronal: 0 }
      r.gain = round2(r.gain + (l.gain ?? 0))
      r.retenue = round2(r.retenue + (l.retenue ?? 0))
      r.patronal = round2(r.patronal + (l.patronal ?? 0))
      recap.set(l.code, r)
    }
  }
  const virements = lignes.filter((l) => l.s.modePaiement === 'VIREMENT' && l.b.netAPayer > 0)
  const autresPaiements = lignes.filter((l) => l.s.modePaiement !== 'VIREMENT')

  return (
    <div className="space-y-6">
      <PageHeader
        titre={`États de paie - ${libellePeriode(p.id)}`}
        sousTitre={db.societe.raisonSociale}
        actions={
          <>
            <Telecharger href={`/api/export/journal?periode=${p.id}`} variante="secondaire">Journal (CSV)</Telecharger>
            <Telecharger href={`/api/export/virements?periode=${p.id}`} variante="secondaire">Virements (CSV)</Telecharger>
            <Telecharger href={`/api/export/comptabilite?periode=${p.id}`} variante="secondaire">Écritures (CSV)</Telecharger>
            <BoutonImprimer />
          </>
        }
      />
      <SelecteurPeriode periodes={calculees} valeur={p.id} />

      <Card titre="Journal de paie" className="print-page">
        <Table>
          <thead>
            <tr><th>Mat.</th><th>Salarié</th><th className="num">Brut</th><th className="num">Brut imp.</th><th className="num">CNSS</th><th className="num">AMO</th><th className="num">CIMR</th><th className="num">Mutuelle</th><th className="num">Net imp.</th><th className="num">IR</th><th className="num">Autres ret.</th><th className="num">Net à payer</th><th className="num">Ch. patron.</th></tr>
          </thead>
          <tbody>
            {lignes.map(({ b, s }) => (
              <tr key={s.id}>
                <td className="font-mono">{s.matricule}</td><td>{nomComplet(s)}</td>
                <td className="num">{mad(b.brut)}</td><td className="num">{mad(b.brutImposable)}</td><td className="num">{mad(b.cnssSalarial)}</td><td className="num">{mad(b.amoSalarial)}</td>
                <td className="num">{mad(b.cimrSalarial)}</td><td className="num">{mad(b.mutuelleSalarial)}</td><td className="num">{mad(b.netImposable)}</td><td className="num">{mad(b.ir)}</td>
                <td className="num">{mad(b.retenuesNet + b.avantagesNature)}</td><td className="num font-medium">{mad(b.netAPayer)}</td><td className="num">{mad(b.patronal.total)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td></td><td>Total ({t.effectif})</td>
              <td className="num">{mad(t.brut)}</td><td className="num">{mad(t.brutImposable)}</td><td className="num">{mad(t.cnssSalarial)}</td><td className="num">{mad(t.amoSalarial)}</td>
              <td className="num">{mad(t.cimrSalarial)}</td><td className="num">{mad(t.mutuelleSalarial)}</td><td className="num">{mad(t.netImposable)}</td><td className="num">{mad(t.ir)}</td>
              <td className="num">{mad(t.retenuesNet + t.avantagesNature)}</td><td className="num">{mad(t.netAPayer)}</td><td className="num">{mad(t.patronalTotal)}</td>
            </tr>
          </tbody>
        </Table>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card titre="Récapitulatif par rubrique" className="print-page">
          <Table>
            <thead><tr><th>Code</th><th>Rubrique</th><th className="num">Gains</th><th className="num">Retenues</th><th className="num">Patronal</th></tr></thead>
            <tbody>
              {[...recap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([code, r]) => (
                <tr key={code}><td className="font-mono">{code}</td><td>{r.libelle}</td><td className="num">{r.gain ? mad(r.gain) : ''}</td><td className="num">{r.retenue ? mad(r.retenue) : ''}</td><td className="num">{r.patronal ? mad(r.patronal) : ''}</td></tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card titre="Écriture comptable de paie (CGNC)" className="print-page">
          <Table>
            <thead><tr><th>Compte</th><th>Libellé</th><th className="num">Débit</th><th className="num">Crédit</th></tr></thead>
            <tbody>
              {ecritures.map((e) => (
                <tr key={e.compte}><td className="font-mono">{e.compte}</td><td>{e.libelle}</td><td className="num">{e.debit ? mad(e.debit) : ''}</td><td className="num">{e.credit ? mad(e.credit) : ''}</td></tr>
              ))}
              <tr className="font-semibold"><td></td><td>Total</td><td className="num">{mad(ecritures.reduce((a, e) => a + e.debit, 0))}</td><td className="num">{mad(ecritures.reduce((a, e) => a + e.credit, 0))}</td></tr>
            </tbody>
          </Table>
        </Card>
      </div>

      <Card titre="Ordre de virement des salaires" className="print-page">
        <div className="mb-4 text-sm">
          <p>À l&apos;attention de : <span className="font-medium">{db.societe.banque}</span></p>
          <p className="mt-2">
            Nous vous prions de bien vouloir débiter notre compte n° <span className="font-mono">{db.societe.rib}</span> de la somme de{' '}
            <span className="font-semibold">{mad(virements.reduce((a, l) => a + l.b.netAPayer, 0))} DH</span> et de virer les montants ci-dessous
            au titre des salaires {dePeriode(p.id)}.
          </p>
        </div>
        <Table>
          <thead><tr><th>Mat.</th><th>Bénéficiaire</th><th>Banque</th><th>RIB</th><th className="num">Montant</th></tr></thead>
          <tbody>
            {virements.map(({ b, s }) => (
              <tr key={s.id}>
                <td className="font-mono">{s.matricule}</td><td>{nomComplet(s)}</td><td>{s.banque}</td>
                <td className={`font-mono ${/^\d{24}$/.test(s.rib) ? '' : 'text-red-700'}`}>{s.rib || 'RIB manquant'}</td>
                <td className="num">{mad(b.netAPayer)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        {autresPaiements.length > 0 && (
          <p className="mt-3 text-sm text-gray-600">
            Hors virement : {autresPaiements.map((l) => `${nomComplet(l.s)} (${l.s.modePaiement.toLowerCase()}, ${mad(l.b.netAPayer)} DH)`).join(' ; ')}.
          </p>
        )}
        <div className="mt-8 text-right text-sm">
          <p>Fait à {db.societe.ville}, le {new Date().toLocaleDateString('fr-FR')}</p>
          <p className="mt-1">{db.societe.representantLegal}, {db.societe.qualiteRepresentant}</p>
          <p className="mt-10 text-gray-500">Signature et cachet</p>
        </div>
      </Card>
    </div>
  )
}
