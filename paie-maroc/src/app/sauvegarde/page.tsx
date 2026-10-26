import { Alerte, Bouton, Card, PageHeader, Telecharger } from '@/components/ui'
import { chargerDemo, importerSauvegarde, nouveauDossier } from '../actions'

export default function PageSauvegarde() {
  return (
    <div className="space-y-6">
      <PageHeader titre="Sauvegarde et dossiers" sousTitre="Export complet des données (société, salariés, périodes, bulletins) et restauration." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card titre="Exporter">
          <p className="mb-3 text-sm text-gray-600">Fichier JSON contenant l&apos;intégralité du dossier de paie. À conserver en lieu sûr : il contient des données personnelles.</p>
          <Telecharger href="/api/export/sauvegarde">Télécharger la sauvegarde</Telecharger>
        </Card>
        <Card titre="Restaurer">
          <form action={importerSauvegarde} className="space-y-3">
            <input type="file" name="fichier" accept="application/json,.json" required className="text-sm" />
            <Bouton type="submit" variante="secondaire">Restaurer ce fichier</Bouton>
          </form>
          <p className="mt-2 text-xs text-gray-500">Remplace toutes les données actuelles.</p>
        </Card>
        <Card titre="Nouveau dossier">
          <Alerte type="attention">Ces actions effacent les données actuelles : exportez une sauvegarde avant.</Alerte>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={nouveauDossier}><Bouton type="submit" variante="danger">Créer un dossier vierge</Bouton></form>
            <form action={chargerDemo}><Bouton type="submit" variante="secondaire">Recharger la démonstration</Bouton></form>
          </div>
        </Card>
      </div>
    </div>
  )
}
