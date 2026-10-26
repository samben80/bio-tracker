import { dateFr, libellePeriode, mad } from '@/lib/exports/format'
import type { CumulAnnuel } from '@/lib/paie/agregats'
import { SITUATIONS_FAMILIALES } from '@/lib/paie/libelles'
import { nomComplet } from '@/lib/paie/salarie'
import type { Bulletin, Salarie, Societe } from '@/lib/paie/types'

interface Props {
  societe: Societe
  salarie: Salarie
  bulletin: Bulletin
  cumul?: CumulAnnuel
  conges: { acquis: number; pris: number; solde: number }
}

const m = (n?: number) => (n ? mad(n) : '')
const t = (n?: number) => (n ? n.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '')

export default function BulletinPaie({ societe: soc, salarie: s, bulletin: b, cumul, conges }: Props) {
  const [a, mo] = b.periode.split('-').map(Number)
  const fin = new Date(Date.UTC(a, mo, 0)).toISOString().slice(0, 10)
  const totalGains = b.lignes.reduce((x, l) => x + (l.gain ?? 0), 0)
  const totalRetenues = b.lignes.reduce((x, l) => x + (l.retenue ?? 0), 0)
  const situation = SITUATIONS_FAMILIALES.find(([k]) => k === s.situationFamiliale)?.[1]

  return (
    <article className="print-page mx-auto max-w-[210mm] rounded-lg border border-gray-200 bg-white p-6 text-[12px] leading-snug shadow-sm">
      <header className="flex items-start justify-between border-b-2 border-emerald-900 pb-3">
        <div>
          <div className="text-base font-bold">{soc.raisonSociale}</div>
          <div>{soc.adresse}</div>
          <div>{soc.codePostal} {soc.ville}</div>
          <div className="mt-1 text-[11px] text-gray-600">
            ICE {soc.ice} · IF {soc.identifiantFiscal} · RC {soc.registreCommerce} · CNSS {soc.cnssAffiliation}
            {soc.cimrAdherent && ` · CIMR ${soc.cimrAdherent}`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold uppercase tracking-wide text-emerald-900">Bulletin de paie</div>
          <div className="font-medium">{libellePeriode(b.periode)}</div>
          <div className="text-[11px] text-gray-600">Du 01/{String(mo).padStart(2, '0')}/{a} au {dateFr(fin)}</div>
        </div>
      </header>

      <section className="mt-3 grid grid-cols-2 gap-4 rounded border border-gray-200 p-3">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          <dt className="text-gray-500">Matricule</dt><dd>{s.matricule}</dd>
          <dt className="text-gray-500">Fonction</dt><dd>{s.poste}</dd>
          <dt className="text-gray-500">Catégorie</dt><dd>{s.categorie}</dd>
          <dt className="text-gray-500">Date d&apos;embauche</dt><dd>{dateFr(s.dateEmbauche)}</dd>
          <dt className="text-gray-500">Contrat</dt><dd>{s.typeContrat}</dd>
          <dt className="text-gray-500">Situation</dt><dd>{situation} · {s.nombreEnfants} enfant(s) · {s.personnesACharge} déduction(s)</dd>
        </dl>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          <dt className="col-span-2 mb-1 text-sm font-bold">{s.civilite} {nomComplet(s)}</dt>
          <dt className="text-gray-500">CIN</dt><dd>{s.cin}</dd>
          <dt className="text-gray-500">N° CNSS</dt><dd>{s.numeroCnss || '-'}</dd>
          {s.affilieCimr && <><dt className="text-gray-500">N° CIMR</dt><dd>{s.numeroCimr}</dd></>}
          <dt className="text-gray-500">Paiement</dt><dd>{s.modePaiement === 'VIREMENT' ? `Virement ${s.banque}` : s.modePaiement === 'CHEQUE' ? 'Chèque' : 'Espèces'}</dd>
          <dt className="text-gray-500">Jours déclarés</dt><dd>{b.joursDeclaresCnss} j</dd>
        </dl>
      </section>

      <table className="mt-3 w-full border-collapse text-[11.5px] [&_td]:border-x [&_td]:border-gray-200 [&_td]:px-1.5 [&_td]:py-0.5 [&_th]:border [&_th]:border-gray-300 [&_th]:bg-emerald-50 [&_th]:px-1.5 [&_th]:py-1">
        <thead>
          <tr>
            <th className="w-10">Code</th><th className="text-left">Désignation</th><th>Nombre / Base</th><th>Taux</th>
            <th>Gains</th><th>Retenues</th><th>Taux pat.</th><th>Part patronale</th>
          </tr>
        </thead>
        <tbody>
          {b.lignes.map((l, i) => (
            <tr key={i}>
              <td className="font-mono text-gray-500">{l.code}</td>
              <td>{l.libelle}</td>
              <td className="num">{t(l.base)}</td>
              <td className="num">{t(l.taux)}</td>
              <td className="num">{m(l.gain)}</td>
              <td className="num">{m(l.retenue)}</td>
              <td className="num">{t(l.tauxPatronal)}</td>
              <td className="num">{m(l.patronal)}</td>
            </tr>
          ))}
          <tr className="border-t border-gray-300 font-semibold [&_td]:py-1">
            <td></td><td>Totaux</td><td></td><td></td>
            <td className="num">{mad(totalGains)}</td><td className="num">{mad(totalRetenues)}</td><td></td><td className="num">{mad(b.patronal.total)}</td>
          </tr>
        </tbody>
      </table>

      <section className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[
          ['Salaire brut', b.brut],
          ['Brut imposable', b.brutImposable],
          ['Frais professionnels', b.fraisProfessionnels],
          ['Net imposable', b.netImposable],
          ['Cotisations salariales', b.totalCotisationsSalariales],
          ['IR (avant/après charges fam.)', `${mad(b.irBrut)} / ${mad(b.ir)}`],
          ['Coût employeur', b.coutEmployeur],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded border border-gray-200 p-1.5">
            <div className="text-[10px] uppercase text-gray-500">{l}</div>
            <div className="num !text-center font-medium">{typeof v === 'number' ? mad(v) : v}</div>
          </div>
        ))}
        <div className="rounded bg-emerald-900 p-1.5 text-white">
          <div className="text-[10px] uppercase">Net à payer</div>
          <div className="num !text-center text-base font-bold">{mad(b.netAPayer)} DH</div>
        </div>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-4 text-[11px]">
        {cumul && (
          <div className="rounded border border-gray-200 p-2">
            <div className="mb-1 font-semibold">Cumuls annuels {a} (janvier - {libellePeriode(b.periode).split(' ')[0].toLowerCase()})</div>
            <div className="grid grid-cols-2 gap-x-2">
              <span className="text-gray-500">Brut imposable</span><span className="num">{mad(cumul.brutImposable)}</span>
              <span className="text-gray-500">Net imposable</span><span className="num">{mad(cumul.netImposable)}</span>
              <span className="text-gray-500">IR retenu</span><span className="num">{mad(cumul.ir)}</span>
              <span className="text-gray-500">Jours déclarés</span><span className="num">{cumul.joursDeclares}</span>
            </div>
          </div>
        )}
        <div className="rounded border border-gray-200 p-2">
          <div className="mb-1 font-semibold">Congés payés</div>
          <div className="grid grid-cols-2 gap-x-2">
            <span className="text-gray-500">Acquis ce mois</span><span className="num">{b.joursCongesAcquis.toFixed(2)} j</span>
            <span className="text-gray-500">Pris ce mois</span><span className="num">{b.joursCongesPris} j</span>
            <span className="text-gray-500">Solde</span><span className="num">{conges.solde.toFixed(2)} j</span>
          </div>
        </div>
      </section>

      <footer className="mt-4 border-t border-gray-200 pt-2 text-[10px] text-gray-500">
        Bulletin établi conformément aux articles 370 et suivants du Code du travail. Conservez-le sans limitation de durée.
        Montants en dirhams (DH).
      </footer>
    </article>
  )
}
