import { Alerte, Card, PageHeader, Stat, Table, Telecharger } from '@/components/ui'
import SelecteurPeriode from '@/components/SelecteurPeriode'
import { LIBELLES_SITUATION, preparerDeclarationCnss } from '@/lib/exports/cnss'
import { libellePeriode, mad } from '@/lib/exports/format'
import { nomComplet } from '@/lib/paie/salarie'
import { lireBase } from '@/lib/store'

export default async function DeclarationCnss(props: PageProps<'/declarations/cnss'>) {
  const q = (await props.searchParams) as { periode?: string }
  const db = await lireBase()
  const calculees = db.periodes.filter((p) => Object.keys(p.bulletins).length)
  const p = calculees.find((x) => x.id === q.periode) ?? calculees.sort((a, b) => b.id.localeCompare(a.id))[0]
  if (!p) return <Alerte>Aucune paie calculée.</Alerte>
  const d = preparerDeclarationCnss(db, p)
  const c = d.cotisations
  const pct = db.parametres.cnss

  return (
    <div className="space-y-6">
      <PageHeader
        titre="Déclaration CNSS / AMO"
        sousTitre={`Bordereau de déclaration des salaires (BDS) - ${libellePeriode(p.id)} - affilié ${db.societe.cnssAffiliation}`}
        actions={<Telecharger href={`/api/export/cnss?periode=${p.id}`}>Fichier Damancom (BDS)</Telecharger>}
      />
      <SelecteurPeriode periodes={calculees} valeur={p.id} />
      {p.statut !== 'CLOTUREE' && <Alerte type="attention">La période n&apos;est pas clôturée : la déclaration peut encore évoluer.</Alerte>}
      {d.anomalies.length > 0 && (
        <Alerte type="erreur">
          <div className="font-medium">Anomalies bloquantes à corriger avant télétransmission :</div>
          <ul className="ml-5 list-disc">{d.anomalies.map((a) => <li key={a}>{a}</li>)}</ul>
        </Alerte>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Salariés déclarés" valeur={d.lignes.length} detail={`${d.lignes.filter((l) => l.entrant).length} entrant(s)`} />
        <Stat label="Masse salariale réelle" valeur={`${mad(d.lignes.reduce((a, l) => a + l.salaireReel, 0))} DH`} />
        <Stat label="Masse plafonnée" valeur={`${mad(d.lignes.reduce((a, l) => a + l.salairePlafonne, 0))} DH`} />
        <Stat label="Total à payer (CNSS + AMO)" valeur={`${mad(c.total)} DH`} detail={`avant le 10 du mois suivant`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card titre="Récapitulatif des cotisations">
          <Table>
            <thead><tr><th>Branche</th><th>Taux</th><th className="num">Montant</th></tr></thead>
            <tbody>
              <tr><td>Prestations sociales - part salariale (plafonnée)</td><td>{pct.prestationsSocialesSalarial} %</td><td className="num">{mad(c.prestationsSalarial)}</td></tr>
              <tr><td>Prestations sociales - part patronale (plafonnée)</td><td>{pct.prestationsSocialesPatronal} %</td><td className="num">{mad(c.prestationsPatronal)}</td></tr>
              <tr><td>Allocations familiales</td><td>{pct.allocationsFamilialesPatronal} %</td><td className="num">{mad(c.allocationsFamiliales)}</td></tr>
              <tr><td>Taxe de formation professionnelle</td><td>{pct.formationProfessionnellePatronal} %</td><td className="num">{mad(c.formationProfessionnelle)}</td></tr>
              <tr className="font-medium"><td>Total régime général CNSS</td><td></td><td className="num">{mad(c.totalCnss)}</td></tr>
              <tr><td>AMO - part salariale</td><td>{pct.amoSalarial} %</td><td className="num">{mad(c.amoSalarial)}</td></tr>
              <tr><td>AMO - part patronale</td><td>{pct.amoPatronal} %</td><td className="num">{mad(c.amoPatronal)}</td></tr>
              <tr><td>Participation AMO</td><td>{pct.amoParticipationPatronal} %</td><td className="num">{mad(c.participationAmo)}</td></tr>
              <tr className="font-medium"><td>Total AMO</td><td></td><td className="num">{mad(c.totalAmo)}</td></tr>
              <tr className="font-bold"><td>Total à régler</td><td></td><td className="num">{mad(c.total)}</td></tr>
            </tbody>
          </Table>
        </Card>
        <Card titre="Procédure Damancom">
          <ol className="ml-5 list-decimal space-y-1 text-sm text-gray-700">
            <li>Télécharger le préétabli du mois sur <span className="font-medium">damancom.ma</span> et vérifier la liste des salariés.</li>
            <li>Télécharger le fichier généré ici (enregistrements B00 à B06, 260 caractères).</li>
            <li>Le déposer dans Damancom (« Télédéclaration » → « Dépôt de fichier »), contrôler le récapitulatif.</li>
            <li>Valider la déclaration puis le télépaiement avant le 10 du mois suivant.</li>
          </ol>
          <p className="mt-3 text-xs text-gray-500">
            Les salariés présents sur le préétabli sont déclarés en B02, les nouveaux entrants en B04. L&apos;identifiant de transfert du préétabli
            est remplacé par l&apos;affiliation + période : vérifiez-le avant dépôt si la CNSS vous a communiqué un identifiant spécifique.
          </p>
        </Card>
      </div>
      <Card titre="Détail par salarié">
        <Table>
          <thead><tr><th>N° CNSS</th><th>Nom et prénom</th><th>Type</th><th className="num">Jours</th><th className="num">Salaire réel</th><th className="num">Salaire plafonné</th><th>Situation</th><th className="num">CNSS sal.</th><th className="num">AMO sal.</th></tr></thead>
          <tbody>
            {d.lignes.map((l) => (
              <tr key={l.salarie.id}>
                <td className="font-mono">{l.salarie.numeroCnss}</td>
                <td>{nomComplet(l.salarie)}</td>
                <td>{l.entrant ? 'Entrant (B04)' : 'Préétabli (B02)'}</td>
                <td className="num">{l.jours}</td>
                <td className="num">{mad(l.salaireReel)}</td>
                <td className="num">{mad(l.salairePlafonne)}</td>
                <td>{LIBELLES_SITUATION[l.situation]}</td>
                <td className="num">{mad(l.bulletin.cnssSalarial)}</td>
                <td className="num">{mad(l.bulletin.amoSalarial)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
