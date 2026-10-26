import { Alerte, Bouton, Card, Champ, Input, PageHeader, Table } from '@/components/ui'
import { lireBase } from '@/lib/store'
import { enregistrerParametres, reinitialiserParametres } from '../actions'

const N = ({ name, value, step = '0.01' }: { name: string; value: number | null; step?: string }) => (
  <Input name={name} type="number" step={step} defaultValue={value ?? ''} className="num" />
)

export default async function PageParametres() {
  const { parametres: p } = await lireBase()
  return (
    <div className="space-y-6">
      <form action={enregistrerParametres} className="space-y-6">
        <PageHeader
          titre="Paramètres légaux"
          sousTitre={p.libelle}
          actions={<Bouton type="submit">Enregistrer</Bouton>}
        />
        <Alerte type="attention">
          Ces paramètres conditionnent tous les calculs. Mettez-les à jour à chaque loi de finances, revalorisation du SMIG
          ou modification des taux CNSS, puis recalculez les périodes ouvertes. Les périodes clôturées ne sont pas recalculées.
        </Alerte>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card titre="CNSS et AMO">
            <div className="grid gap-3 sm:grid-cols-2">
              <Champ label="Plafond mensuel CNSS (DH)"><N name="cnss.plafondMensuel" value={p.cnss.plafondMensuel} /></Champ>
              <Champ label="Jours déclarés max / mois"><N name="cnss.joursMaxDeclares" value={p.cnss.joursMaxDeclares} step="1" /></Champ>
              <Champ label="Prestations sociales - salarial %"><N name="cnss.prestationsSocialesSalarial" value={p.cnss.prestationsSocialesSalarial} /></Champ>
              <Champ label="Prestations sociales - patronal %"><N name="cnss.prestationsSocialesPatronal" value={p.cnss.prestationsSocialesPatronal} /></Champ>
              <Champ label="Allocations familiales - patronal %"><N name="cnss.allocationsFamilialesPatronal" value={p.cnss.allocationsFamilialesPatronal} /></Champ>
              <Champ label="Taxe formation prof. - patronal %"><N name="cnss.formationProfessionnellePatronal" value={p.cnss.formationProfessionnellePatronal} /></Champ>
              <Champ label="AMO - salarial %"><N name="cnss.amoSalarial" value={p.cnss.amoSalarial} /></Champ>
              <Champ label="AMO - patronal %"><N name="cnss.amoPatronal" value={p.cnss.amoPatronal} /></Champ>
              <Champ label="Participation AMO - patronal %"><N name="cnss.amoParticipationPatronal" value={p.cnss.amoParticipationPatronal} /></Champ>
            </div>
          </Card>
          <Card titre="Frais professionnels et déductions IR">
            <div className="grid gap-3 sm:grid-cols-2">
              <Champ label="Seuil SBI annuel (DH)"><N name="fraisProfessionnels.seuilAnnuel" value={p.fraisProfessionnels.seuilAnnuel} /></Champ>
              <Champ label="Plafond annuel (DH)"><N name="fraisProfessionnels.plafondAnnuel" value={p.fraisProfessionnels.plafondAnnuel} /></Champ>
              <Champ label="Taux sous le seuil %"><N name="fraisProfessionnels.tauxSousSeuil" value={p.fraisProfessionnels.tauxSousSeuil} /></Champ>
              <Champ label="Taux au-delà du seuil %"><N name="fraisProfessionnels.tauxAuDela" value={p.fraisProfessionnels.tauxAuDela} /></Champ>
              <Champ label="Déduction par personne à charge (DH/an)"><N name="deductionParPersonneACharge" value={p.deductionParPersonneACharge} /></Champ>
              <Champ label="Nombre max de personnes à charge"><N name="maxPersonnesACharge" value={p.maxPersonnesACharge} step="1" /></Champ>
              <Champ label="Plafond intérêts logement (% SBI)"><N name="plafondInteretsLogementPct" value={p.plafondInteretsLogementPct} /></Champ>
              <Champ label="Libellé du jeu de paramètres"><Input name="libelle" defaultValue={p.libelle} /></Champ>
            </div>
          </Card>
          <Card titre="Barème annuel de l'IR">
            <Table>
              <thead>
                <tr><th>De (DH)</th><th>À (DH)</th><th>Taux %</th><th>Somme à déduire</th></tr>
              </thead>
              <tbody>
                {p.bareme.map((t, i) => (
                  <tr key={i}>
                    <td><N name={`bareme.${i}.min`} value={t.min} /></td>
                    <td><N name={`bareme.${i}.max`} value={t.max} /></td>
                    <td><N name={`bareme.${i}.taux`} value={t.taux} /></td>
                    <td><N name={`bareme.${i}.deduction`} value={t.deduction} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <p className="mt-2 text-xs text-gray-500">Laisser « À » vide pour la dernière tranche. L&apos;IR mensuel est calculé sur le net imposable annualisé.</p>
          </Card>
          <Card titre="Temps de travail, SMIG, ancienneté">
            <div className="grid gap-3 sm:grid-cols-2">
              <Champ label="SMIG horaire (DH)"><N name="smigHoraire" value={p.smigHoraire} /></Champ>
              <Champ label="Heures mensuelles légales"><N name="heuresMensuellesLegales" value={p.heuresMensuellesLegales} /></Champ>
              <Champ label="Jours ouvrables / mois"><N name="joursOuvrablesMois" value={p.joursOuvrablesMois} step="1" /></Champ>
              <Champ label="Ratio CIMR patronal / salarial"><N name="cimrRatioPatronal" value={p.cimrRatioPatronal} /></Champ>
              <Champ label="Majoration HS 1 %"><N name="tauxHeuresSup.hs25" value={p.tauxHeuresSup.hs25} /></Champ>
              <Champ label="Majoration HS 2 %"><N name="tauxHeuresSup.hs50" value={p.tauxHeuresSup.hs50} /></Champ>
              <Champ label="Majoration HS 3 %"><N name="tauxHeuresSup.hs100" value={p.tauxHeuresSup.hs100} /></Champ>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="hidden" name="arrondirNet__present" value="1" />
                <input type="checkbox" name="arrondirNet" defaultChecked={p.arrondirNet} /> Arrondir le net au dirham supérieur
              </label>
            </div>
            <div className="mt-4 text-sm font-medium text-gray-700">Prime d&apos;ancienneté (art. 350)</div>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {p.anciennete.map((t, i) => (
                <div key={i} className="space-y-1">
                  <N name={`anciennete.${i}.anneesMin`} value={t.anneesMin} step="1" />
                  <N name={`anciennete.${i}.taux`} value={t.taux} />
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">Ligne 1 : années d&apos;ancienneté minimales - ligne 2 : taux %.</p>
          </Card>
        </div>
      </form>
      <form action={reinitialiserParametres}>
        <Bouton variante="danger" type="submit">Rétablir les paramètres par défaut</Bouton>
      </form>
    </div>
  )
}
