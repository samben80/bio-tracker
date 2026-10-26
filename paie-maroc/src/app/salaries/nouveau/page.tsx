import FormulaireSalarie from '@/components/FormulaireSalarie'
import { PageHeader } from '@/components/ui'
import { nouveauSalarie } from '@/lib/paie/salarie'
import { lireBase } from '@/lib/store'
import { enregistrerSalarie } from '../../actions'

export default async function NouveauSalarie() {
  const db = await lireBase()
  return (
    <div>
      <PageHeader titre="Nouveau salarié" sousTitre="Création du dossier du personnel" />
      <FormulaireSalarie salarie={nouveauSalarie()} rubriques={db.rubriques} action={enregistrerSalarie.bind(null, '')} />
    </div>
  )
}
