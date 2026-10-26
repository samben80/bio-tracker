import Link from 'next/link'
import { notFound } from 'next/navigation'
import FormulaireSalarie from '@/components/FormulaireSalarie'
import { Badge, Bouton, Card, Champ, Input, Lien, PageHeader, Select, Stat, Table } from '@/components/ui'
import { dateFr, libellePeriode, mad } from '@/lib/exports/format'
import { soldeConges } from '@/lib/paie/agregats'
import { anneesRevolues } from '@/lib/paie/calcul'
import { TYPES_DOCUMENTS } from '@/lib/paie/defaults'
import { LIBELLES_CONTRAT } from '@/lib/paie/libelles'
import { nomComplet } from '@/lib/paie/salarie'
import { lireBase } from '@/lib/store'
import { ajouterDocument, enregistrerSalarie, supprimerDocument, supprimerSalarie } from '../../actions'

const STATUT_DOC = { FOURNI: ['vert', 'Fourni'], MANQUANT: ['rouge', 'Manquant'], A_RENOUVELER: ['orange', 'À renouveler'] } as const

export default async function FicheSalarie(props: PageProps<'/salaries/[id]'>) {
  const { id } = await props.params
  const db = await lireBase()
  const s = db.salaries.find((x) => x.id === id)
  if (!s) notFound()

  const bulletins = db.periodes
    .filter((p) => p.bulletins[s.id])
    .map((p) => ({ periode: p, b: p.bulletins[s.id] }))
    .sort((a, b) => b.periode.id.localeCompare(a.periode.id))
  const conges = soldeConges(db, s.id)
  const anciennete = anneesRevolues(s.dateAnciennete || s.dateEmbauche, new Date())
  const aujourdhui = new Date().toISOString().slice(0, 10)
  const manquants = TYPES_DOCUMENTS.filter((t) => !s.documents.some((d) => d.type === t))

  return (
    <div className="space-y-6">
      <PageHeader
        titre={`${s.civilite} ${nomComplet(s)}`}
        sousTitre={<>Matricule {s.matricule} · {s.poste} · {LIBELLES_CONTRAT[s.typeContrat]} depuis le {dateFr(s.dateEmbauche)} {!s.actif && <Badge couleur="rouge">Sorti</Badge>}</>}
        actions={
          <>
            <Lien href={`/salaries/${s.id}/documents/attestation-travail`}>Attestation de travail</Lien>
            <Lien href={`/salaries/${s.id}/documents/attestation-salaire`}>Attestation de salaire</Lien>
            <Lien href={`/salaries/${s.id}/documents/certificat-travail`}>Certificat de travail</Lien>
            <Lien href={`/salaries/${s.id}/documents/solde-tout-compte`} variante="primaire">Solde de tout compte</Lien>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Ancienneté" valeur={`${anciennete} an${anciennete > 1 ? 's' : ''}`} />
        <Stat label="Salaire de base" valeur={`${mad(s.salaireBase)} ${s.typeSalaire === 'HORAIRE' ? 'DH/h' : 'DH'}`} />
        <Stat label="Dernier net à payer" valeur={bulletins[0] ? `${mad(bulletins[0].b.netAPayer)} DH` : '-'} detail={bulletins[0] && libellePeriode(bulletins[0].periode.id)} />
        <Stat label="Solde de congés" valeur={`${conges.solde.toFixed(1)} j`} detail={`acquis ${conges.acquis.toFixed(1)} · pris ${conges.pris}`} />
      </div>

      <FormulaireSalarie salarie={s} rubriques={db.rubriques} action={enregistrerSalarie.bind(null, s.id)} />

      <div id="dossier">
        <Card titre="Dossier administratif">
          <Table>
            <thead>
              <tr><th>Pièce</th><th>Référence</th><th>Délivrance</th><th>Expiration</th><th>Statut</th><th>Note</th><th></th></tr>
            </thead>
            <tbody>
              {s.documents.map((d) => {
                const [c, l] = STATUT_DOC[d.statut]
                const expire = d.dateExpiration && d.dateExpiration < aujourdhui && d.type !== 'Contrat de travail'
                return (
                  <tr key={d.id}>
                    <td>{d.type}</td>
                    <td className="font-mono">{d.reference}</td>
                    <td>{dateFr(d.dateDelivrance)}</td>
                    <td className={expire ? 'font-medium text-red-700' : ''}>{dateFr(d.dateExpiration)}{expire && ' (expiré)'}</td>
                    <td><Badge couleur={c}>{l}</Badge></td>
                    <td className="text-gray-600">{d.note}</td>
                    <td>
                      <form action={supprimerDocument.bind(null, s.id, d.id)}>
                        <button className="text-sm text-red-700 hover:underline">Supprimer</button>
                      </form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
          <form action={ajouterDocument.bind(null, s.id)} className="mt-4 grid gap-2 border-t border-gray-100 pt-4 md:grid-cols-6">
            <Champ label="Pièce" className="md:col-span-2"><Select name="type" options={[...TYPES_DOCUMENTS, 'Autre'].map((t) => [t, t])} /></Champ>
            <Champ label="Référence"><Input name="reference" /></Champ>
            <Champ label="Délivrance"><Input name="dateDelivrance" type="date" /></Champ>
            <Champ label="Expiration"><Input name="dateExpiration" type="date" /></Champ>
            <Champ label="Statut"><Select name="statut" options={[['FOURNI', 'Fourni'], ['MANQUANT', 'Manquant'], ['A_RENOUVELER', 'À renouveler']]} /></Champ>
            <Champ label="Note" className="md:col-span-5"><Input name="note" /></Champ>
            <div className="self-end"><Bouton type="submit">Ajouter la pièce</Bouton></div>
          </form>
          {manquants.length > 0 && <p className="mt-3 text-xs text-gray-500">Pièces usuelles non répertoriées : {manquants.join(', ')}.</p>}
        </Card>
      </div>

      <Card titre="Historique des bulletins">
        <Table>
          <thead>
            <tr><th>Période</th><th className="num">Brut</th><th className="num">Net imposable</th><th className="num">IR</th><th className="num">Net à payer</th><th className="num">Coût employeur</th><th></th></tr>
          </thead>
          <tbody>
            {bulletins.map(({ periode, b }) => (
              <tr key={periode.id}>
                <td>{libellePeriode(periode.id)}</td>
                <td className="num">{mad(b.brut)}</td>
                <td className="num">{mad(b.netImposable)}</td>
                <td className="num">{mad(b.ir)}</td>
                <td className="num font-medium">{mad(b.netAPayer)}</td>
                <td className="num">{mad(b.coutEmployeur)}</td>
                <td><Link href={`/paie/${periode.id}/bulletins/${s.id}`} className="text-emerald-800 hover:underline">Bulletin</Link></td>
              </tr>
            ))}
            {bulletins.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-gray-500">Aucun bulletin.</td></tr>}
          </tbody>
        </Table>
      </Card>

      {bulletins.length === 0 && (
        <form action={supprimerSalarie.bind(null, s.id)}>
          <Bouton variante="danger" type="submit">Supprimer ce salarié</Bouton>
        </form>
      )}
    </div>
  )
}
