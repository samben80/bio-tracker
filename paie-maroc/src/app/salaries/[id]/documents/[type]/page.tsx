import { notFound } from 'next/navigation'
import BoutonImprimer from '@/components/BoutonImprimer'
import { Alerte, Bouton, Card, Champ, Input, Lien, Select } from '@/components/ui'
import { dateFr, dePeriode, libellePeriode, mad } from '@/lib/exports/format'
import { soldeConges } from '@/lib/paie/agregats'
import { LIBELLES_CONTRAT } from '@/lib/paie/libelles'
import { nomComplet } from '@/lib/paie/salarie'
import { calculerSoldeToutCompte, MOTIFS_SORTIE, preavisLegal, type MotifSortie } from '@/lib/paie/stc'
import type { BaseDonnees, Salarie } from '@/lib/paie/types'
import { lireBase } from '@/lib/store'
import { reporterSoldeToutCompte } from '../../../../actions'

function EnTete({ db }: { db: BaseDonnees }) {
  const soc = db.societe
  return (
    <header className="mb-10 border-b-2 border-emerald-900 pb-3">
      <div className="text-lg font-bold">{soc.raisonSociale}</div>
      <div className="text-sm">{soc.adresse} - {soc.codePostal} {soc.ville}</div>
      <div className="text-xs text-gray-600">ICE {soc.ice} · IF {soc.identifiantFiscal} · RC {soc.registreCommerce} · CNSS {soc.cnssAffiliation} · Tél. {soc.telephone}</div>
    </header>
  )
}

function Signature({ db }: { db: BaseDonnees }) {
  return (
    <div className="mt-12 text-right">
      <p>Fait à {db.societe.ville}, le {new Date().toLocaleDateString('fr-FR')}</p>
      <p className="mt-1 font-medium">{db.societe.representantLegal}</p>
      <p>{db.societe.qualiteRepresentant}</p>
      <p className="mt-14 text-sm text-gray-500">Signature et cachet de l&apos;employeur</p>
    </div>
  )
}

const designation = (s: Salarie) => `${s.civilite} ${nomComplet(s)}, titulaire de la CIN n° ${s.cin}, immatriculé(e) à la CNSS sous le n° ${s.numeroCnss || '—'}`

export default async function DocumentRh(props: PageProps<'/salaries/[id]/documents/[type]'>) {
  const { id, type } = await props.params
  const q = (await props.searchParams) as Record<string, string | undefined>
  const db = await lireBase()
  const s = db.salaries.find((x) => x.id === id)
  if (!s) notFound()
  const page = 'print-page mx-auto max-w-[210mm] rounded-lg border border-gray-200 bg-white p-10 text-[14px] leading-relaxed shadow-sm'
  const barre = (
    <div className="no-print mb-4 flex gap-2">
      <Lien href={`/salaries/${s.id}`}>Retour à la fiche</Lien>
      <BoutonImprimer />
    </div>
  )

  if (type === 'attestation-travail') {
    return (
      <div>
        {barre}
        <article className={page}>
          <EnTete db={db} />
          <h1 className="mb-10 text-center text-xl font-bold uppercase underline">Attestation de travail</h1>
          <p>
            Nous soussignés, <strong>{db.societe.raisonSociale}</strong>, {db.societe.formeJuridique}, sise {db.societe.adresse}, {db.societe.ville}, affiliée à la CNSS sous le
            n° {db.societe.cnssAffiliation}, attestons par la présente que :
          </p>
          <p className="my-6 pl-6"><strong>{designation(s)}</strong></p>
          <p>
            {s.dateSortie ? 'a été employé(e)' : 'est employé(e)'} au sein de notre société en qualité de <strong>{s.poste}</strong>, dans le cadre d&apos;un contrat {LIBELLES_CONTRAT[s.typeContrat]},
            depuis le <strong>{dateFr(s.dateEmbauche)}</strong>{s.dateSortie ? <> jusqu&apos;au <strong>{dateFr(s.dateSortie)}</strong></> : ' à ce jour'}.
          </p>
          <p className="mt-6">Cette attestation est délivrée à l&apos;intéressé(e), sur sa demande, pour servir et valoir ce que de droit.</p>
          <Signature db={db} />
        </article>
      </div>
    )
  }

  if (type === 'attestation-salaire') {
    const bulletins = db.periodes.filter((p) => p.bulletins[s.id]).sort((a, b) => b.id.localeCompare(a.id)).slice(0, 12)
    const moy = (f: (b: (typeof bulletins)[number]['bulletins'][string]) => number) =>
      bulletins.length ? bulletins.reduce((a, p) => a + f(p.bulletins[s.id]), 0) / bulletins.length : 0
    return (
      <div>
        {barre}
        <article className={page}>
          <EnTete db={db} />
          <h1 className="mb-10 text-center text-xl font-bold uppercase underline">Attestation de salaire</h1>
          <p>Nous soussignés, <strong>{db.societe.raisonSociale}</strong>, attestons que <strong>{designation(s)}</strong>, occupant le poste de {s.poste} depuis le {dateFr(s.dateEmbauche)}, perçoit les rémunérations suivantes :</p>
          <table className="my-6 w-full border-collapse text-sm [&_td]:border [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-50 [&_th]:px-2 [&_th]:py-1">
            <thead><tr><th>Période</th><th>Salaire brut</th><th>Net à payer</th></tr></thead>
            <tbody>
              {bulletins.map((p) => (
                <tr key={p.id}><td>{libellePeriode(p.id)}</td><td className="num">{mad(p.bulletins[s.id].brut)} DH</td><td className="num">{mad(p.bulletins[s.id].netAPayer)} DH</td></tr>
              ))}
              <tr className="font-semibold"><td>Moyenne mensuelle</td><td className="num">{mad(moy((b) => b.brut))} DH</td><td className="num">{mad(moy((b) => b.netAPayer))} DH</td></tr>
            </tbody>
          </table>
          <p>Cette attestation est délivrée à l&apos;intéressé(e), sur sa demande, pour servir et valoir ce que de droit.</p>
          <Signature db={db} />
        </article>
      </div>
    )
  }

  if (type === 'certificat-travail') {
    return (
      <div>
        {barre}
        {!s.dateSortie && <div className="no-print mb-4"><Alerte type="attention">Aucune date de sortie : le certificat de travail est remis à la fin du contrat (art. 72 du Code du travail).</Alerte></div>}
        <article className={page}>
          <EnTete db={db} />
          <h1 className="mb-10 text-center text-xl font-bold uppercase underline">Certificat de travail</h1>
          <p>Nous soussignés, <strong>{db.societe.raisonSociale}</strong>, certifions avoir employé :</p>
          <p className="my-6 pl-6"><strong>{designation(s)}</strong>, né(e) le {dateFr(s.dateNaissance)} à {s.lieuNaissance},</p>
          <p>du <strong>{dateFr(s.dateEmbauche)}</strong> au <strong>{dateFr(s.dateSortie) || '…………'}</strong>, en qualité de <strong>{s.poste}</strong> ({s.categorie}).</p>
          <p className="mt-6">L&apos;intéressé(e) nous quitte libre de tout engagement.</p>
          <p className="mt-6 text-sm text-gray-600">Certificat établi conformément à l&apos;article 72 de la loi n° 65-99 relative au Code du travail, exonéré des droits de timbre et d&apos;enregistrement.</p>
          <Signature db={db} />
        </article>
      </div>
    )
  }

  if (type === 'solde-tout-compte') {
    const dateSortie = q.dateSortie || s.dateSortie || new Date().toISOString().slice(0, 10)
    const motif = (q.motif || s.motifSortie || 'DEMISSION') as MotifSortie
    const conges = soldeConges(db, s.id)
    const params = {
      dateSortie,
      motif,
      moisPreavis: q.moisPreavis !== undefined ? Number(q.moisPreavis) : 0,
      joursCongesRestants: q.joursCongesRestants !== undefined ? Number(q.joursCongesRestants) : Math.max(0, Math.round(conges.solde * 2) / 2),
      abusif: q.abusif === 'on',
    }
    const r = calculerSoldeToutCompte(db, s, params)
    const periodeSortie = db.periodes.find((p) => p.id === dateSortie.slice(0, 7))
    const bulletinSortie = periodeSortie?.bulletins[s.id]
    return (
      <div className="space-y-4">
        <div className="no-print space-y-4">
          <div className="flex gap-2"><Lien href={`/salaries/${s.id}`}>Retour à la fiche</Lien><BoutonImprimer /></div>
          <Card titre="Paramètres de la sortie">
            <form className="grid gap-3 md:grid-cols-6">
              <Champ label="Date de sortie"><Input type="date" name="dateSortie" defaultValue={dateSortie} /></Champ>
              <Champ label="Motif" className="md:col-span-2"><Select name="motif" defaultValue={motif} options={MOTIFS_SORTIE} /></Champ>
              <Champ label="Préavis payé (mois)" aide={`Légal indicatif : ${preavisLegal(s, dateSortie).toFixed(2)} mois`}><Input type="number" step="0.01" name="moisPreavis" defaultValue={params.moisPreavis} /></Champ>
              <Champ label="Congés restants (j)" aide={`Solde calculé : ${conges.solde.toFixed(2)} j`}><Input type="number" step="0.5" name="joursCongesRestants" defaultValue={params.joursCongesRestants} /></Champ>
              <label className="flex items-center gap-2 self-center text-sm"><input type="checkbox" name="abusif" defaultChecked={params.abusif} /> Dommages-intérêts (art. 41)</label>
              <div className="md:col-span-6"><Bouton type="submit" variante="secondaire">Recalculer</Bouton></div>
            </form>
            <form action={reporterSoldeToutCompte.bind(null, s.id)} className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
              {Object.entries(params).map(([k, v]) => (typeof v === 'boolean' ? v && <input key={k} type="hidden" name={k} value="on" /> : <input key={k} type="hidden" name={k} value={String(v)} />))}
              <Bouton type="submit">Reporter dans la paie {dePeriode(dateSortie.slice(0, 7))}</Bouton>
              <span className="text-xs text-gray-500">Enregistre la sortie, proratise le mois, ajoute les indemnités au dernier bulletin et marque le salarié « sortant » pour la CNSS.</span>
            </form>
          </Card>
        </div>
        <article className={page}>
          <EnTete db={db} />
          <h1 className="mb-8 text-center text-xl font-bold uppercase underline">Reçu pour solde de tout compte</h1>
          <p>
            Je soussigné(e), <strong>{designation(s)}</strong>, ayant occupé le poste de {s.poste} du {dateFr(s.dateEmbauche)} au {dateFr(dateSortie)} ({r.anciennete.toFixed(2)} années d&apos;ancienneté),
            motif : {MOTIFS_SORTIE.find(([k]) => k === motif)?.[1].toLowerCase()}, reconnais avoir reçu de la société <strong>{db.societe.raisonSociale}</strong> les sommes suivantes :
          </p>
          <table className="my-6 w-full border-collapse text-sm [&_td]:border [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1">
            <tbody>
              <tr><td>Salaire mensuel moyen de référence</td><td className="num">{mad(r.salaireMoyen)} DH</td></tr>
              <tr><td>Indemnité compensatrice de congés payés ({params.joursCongesRestants} j × {mad(r.journalier)})</td><td className="num">{mad(r.conges)} DH</td></tr>
              <tr><td>Indemnité compensatrice de préavis ({params.moisPreavis} mois)</td><td className="num">{mad(r.preavis)} DH</td></tr>
              <tr><td>Indemnité légale de licenciement ({r.licenciement.heures} h × {mad(r.licenciement.tauxHoraire)}) - exonérée</td><td className="num">{mad(r.licenciement.montant)} DH</td></tr>
              {r.dommages > 0 && <tr><td>Dommages et intérêts ({r.moisDommages} mois) - exonérés</td><td className="num">{mad(r.dommages)} DH</td></tr>}
              <tr className="font-semibold"><td>Total des indemnités de rupture (brut)</td><td className="num">{mad(r.totalBrut)} DH</td></tr>
              {bulletinSortie && <tr className="font-bold"><td>Net à payer du dernier bulletin ({libellePeriode(periodeSortie.id)}), salaire et indemnités inclus, après retenues CNSS, AMO et IR</td><td className="num">{mad(bulletinSortie.netAPayer)} DH</td></tr>}
            </tbody>
          </table>
          <p>
            Cette somme m&apos;est versée pour solde de tout compte, en paiement des salaires, accessoires de salaire et de toutes indemnités dues au titre de l&apos;exécution
            et de la cessation de mon contrat de travail.
          </p>
          <p className="mt-4 text-sm">
            Le présent reçu, établi en deux exemplaires dont un remis au salarié, peut être dénoncé dans les soixante jours suivant sa signature (art. 74 du Code du travail).
            Le salarié doit faire précéder sa signature de la mention manuscrite « lu et approuvé pour solde de tout compte » et du montant reçu.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-8 text-sm">
            <div><p className="font-medium">Le salarié</p><p className="text-gray-500">« Lu et approuvé pour solde de tout compte »</p></div>
            <div className="text-right"><p className="font-medium">Pour l&apos;employeur, {db.societe.representantLegal}</p><p className="text-gray-500">Fait à {db.societe.ville}, le {new Date().toLocaleDateString('fr-FR')}</p></div>
          </div>
        </article>
      </div>
    )
  }

  notFound()
}
