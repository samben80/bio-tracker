import Link from 'next/link'
import { Alerte, Badge, Card, Lien, PageHeader, Stat, Table } from '@/components/ui'
import { dateFr, dePeriode, libellePeriode, mad } from '@/lib/exports/format'
import { bulletinsDe, totaliser } from '@/lib/paie/agregats'
import { nomComplet } from '@/lib/paie/salarie'
import { lireBase } from '@/lib/store'

const STATUTS = { OUVERTE: ['orange', 'Ouverte'], CALCULEE: ['bleu', 'Calculée'], CLOTUREE: ['vert', 'Clôturée'] } as const

export default async function TableauDeBord() {
  const db = await lireBase()
  const actifs = db.salaries.filter((s) => s.actif)
  const periodes = [...db.periodes].sort((a, b) => b.id.localeCompare(a.id))
  const derniere = periodes.find((p) => Object.keys(p.bulletins).length)
  const enCours = periodes.find((p) => p.statut !== 'CLOTUREE')
  const t = totaliser(bulletinsDe(derniere))

  const maintenant = new Date()
  const aujourdhui = maintenant.toISOString().slice(0, 10)
  const dans60j = new Date(maintenant.getTime() + 60 * 864e5).toISOString().slice(0, 10)
  const alertes: { niveau: 'rouge' | 'orange'; texte: string; lien: string }[] = []
  for (const s of actifs) {
    if (!s.numeroCnss && s.typeContrat !== 'ANAPEC' && s.typeContrat !== 'STAGE') alertes.push({ niveau: 'rouge', texte: `${nomComplet(s)} : numéro CNSS manquant (immatriculation à demander)`, lien: `/salaries/${s.id}` })
    if (s.modePaiement === 'VIREMENT' && !/^\d{24}$/.test(s.rib)) alertes.push({ niveau: 'rouge', texte: `${nomComplet(s)} : RIB absent ou invalide (24 chiffres)`, lien: `/salaries/${s.id}` })
    if (s.dateFinContrat && s.dateFinContrat <= dans60j) alertes.push({ niveau: s.dateFinContrat < aujourdhui ? 'rouge' : 'orange', texte: `${nomComplet(s)} : fin de contrat ${s.typeContrat} le ${dateFr(s.dateFinContrat)}`, lien: `/salaries/${s.id}` })
    for (const d of s.documents) {
      if (d.statut === 'MANQUANT') alertes.push({ niveau: 'orange', texte: `${nomComplet(s)} : document manquant - ${d.type}`, lien: `/salaries/${s.id}#dossier` })
      else if (d.dateExpiration && d.dateExpiration <= dans60j && d.type !== 'Contrat de travail') alertes.push({ niveau: d.dateExpiration < aujourdhui ? 'rouge' : 'orange', texte: `${nomComplet(s)} : ${d.type} expire le ${dateFr(d.dateExpiration)}`, lien: `/salaries/${s.id}#dossier` })
    }
  }

  // Calendrier déclaratif du mois suivant la dernière paie
  const echeances = derniere
    ? (() => {
        const [a, m] = derniere.id.split('-').map(Number)
        const suivant = new Date(Date.UTC(a, m, 1))
        const fin = new Date(Date.UTC(a, m + 1, 0))
        const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { timeZone: 'UTC' })
        const e = [
          { libelle: `Déclaration et paiement CNSS / AMO - ${libellePeriode(derniere.id)}`, date: `le 10/${String(suivant.getUTCMonth() + 1).padStart(2, '0')}/${suivant.getUTCFullYear()}`, montant: t.cnssSalarial + t.amoSalarial + t.patronalPrestations + t.patronalAF + t.patronalTFP + t.patronalAMO + t.patronalParticipationAMO, lien: `/declarations/cnss?periode=${derniere.id}` },
          { libelle: `Versement IR retenu à la source (Simpl-IR) - ${libellePeriode(derniere.id)}`, date: `le ${fmt(fin)}`, montant: t.ir, lien: `/declarations/ir?periode=${derniere.id}` },
        ]
        if (m % 3 === 0) e.push({ libelle: `Déclaration CIMR T${m / 3} ${a}`, date: `fin ${['janvier', 'avril', 'juillet', 'octobre'][(m / 3) % 4]}`, montant: NaN, lien: `/declarations/cimr?annee=${a}&trimestre=${m / 3}` })
        if (m === 12) e.push({ libelle: `Déclaration annuelle des traitements et salaires (9421) ${a}`, date: `le 28/02/${a + 1}`, montant: NaN, lien: `/declarations/ir?annee=${a}` })
        return e
      })()
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        titre="Tableau de bord"
        sousTitre={db.societe.raisonSociale ? `${db.societe.raisonSociale} - ${db.societe.ville}` : 'Commencez par configurer votre société'}
        actions={enCours ? <Lien href={`/paie/${enCours.id}`} variante="primaire">Paie {dePeriode(enCours.id)}</Lien> : <Lien href="/paie" variante="primaire">Ouvrir une période</Lien>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Effectif actif" valeur={actifs.length} detail={`${actifs.filter((s) => s.typeContrat === 'CDI').length} CDI · ${actifs.filter((s) => s.typeContrat !== 'CDI').length} autres`} />
        <Stat label="Masse salariale brute" valeur={`${mad(t.brut)} DH`} detail={derniere ? libellePeriode(derniere.id) : 'aucune paie calculée'} />
        <Stat label="Net à payer" valeur={`${mad(t.netAPayer)} DH`} />
        <Stat label="Charges patronales" valeur={`${mad(t.patronalTotal)} DH`} detail={t.brut ? `${((t.patronalTotal / t.brut) * 100).toFixed(1)} % du brut` : undefined} />
        <Stat label="Coût employeur" valeur={`${mad(t.coutEmployeur)} DH`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card titre="Échéances déclaratives">
          {echeances.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune paie calculée.</p>
          ) : (
            <Table>
              <tbody>
                {echeances.map((e) => (
                  <tr key={e.libelle}>
                    <td>
                      <Link href={e.lien} className="text-emerald-800 hover:underline">{e.libelle}</Link>
                    </td>
                    <td className="whitespace-nowrap text-gray-600">avant {e.date}</td>
                    <td className="num">{Number.isNaN(e.montant) ? '' : `${mad(e.montant)} DH`}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card titre="Périodes de paie" actions={<Link href="/paie" className="text-sm text-emerald-800 hover:underline">Toutes</Link>}>
          <Table>
            <tbody>
              {periodes.slice(0, 5).map((p) => {
                const [c, l] = STATUTS[p.statut]
                const tp = totaliser(bulletinsDe(p))
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/paie/${p.id}`} className="font-medium text-emerald-800 hover:underline">{libellePeriode(p.id)}</Link>
                    </td>
                    <td><Badge couleur={c}>{l}</Badge></td>
                    <td className="text-gray-600">{tp.effectif} bulletins</td>
                    <td className="num">{mad(tp.netAPayer)} DH</td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </Card>
      </div>

      <Card titre={`Alertes RH et administratives (${alertes.length})`}>
        {alertes.length === 0 ? (
          <Alerte>Aucune alerte : dossiers complets et contrats à jour.</Alerte>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {alertes.map((a, i) => (
              <li key={i} className="flex items-center gap-3 py-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${a.niveau === 'rouge' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <Link href={a.lien} className="hover:underline">{a.texte}</Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
