import EditeurElements from './EditeurElements'
import { Bouton, Card, Champ, Input, Select } from './ui'
import { LIBELLES_CONTRAT, SITUATIONS_FAMILIALES } from '@/lib/paie/libelles'
import type { Rubrique, Salarie } from '@/lib/paie/types'

interface Props {
  salarie: Salarie
  rubriques: Rubrique[]
  action: (fd: FormData) => Promise<void>
}

export default function FormulaireSalarie({ salarie: s, rubriques, action }: Props) {
  const t = ({ name, label, type = 'text', aide, required }: { name: keyof Salarie; label: string; type?: string; aide?: string; required?: boolean }) => (
    <Champ label={label} aide={aide}>
      <Input name={name} type={type} step={type === 'number' ? '0.01' : undefined} defaultValue={String(s[name] ?? '')} required={required} />
    </Champ>
  )
  const c = ({ name, label }: { name: keyof Salarie; label: string }) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="hidden" name={`${name}__present`} value="1" />
      <input type="checkbox" name={name} defaultChecked={Boolean(s[name])} /> {label}
    </label>
  )

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <Card titre="État civil">
          <div className="grid gap-3 sm:grid-cols-3">
            <Champ label="Civilité"><Select name="civilite" defaultValue={s.civilite} options={[['M.', 'M.'], ['Mme', 'Mme'], ['Mlle', 'Mlle']]} /></Champ>
            {t({ name: 'nom', label: 'Nom', required: true })}
            {t({ name: 'prenom', label: 'Prénom', required: true })}
            <Champ label="Sexe"><Select name="sexe" defaultValue={s.sexe} options={[['M', 'Masculin'], ['F', 'Féminin']]} /></Champ>
            {t({ name: 'cin', label: 'CIN / carte de séjour' })}
            {t({ name: 'nationalite', label: 'Nationalité' })}
            {t({ name: 'dateNaissance', label: 'Date de naissance', type: 'date' })}
            {t({ name: 'lieuNaissance', label: 'Lieu de naissance' })}
            {t({ name: 'matricule', label: 'Matricule', aide: 'Attribué automatiquement si vide' })}
          </div>
        </Card>
        <Card titre="Situation familiale (IR et allocations familiales)">
          <div className="grid gap-3 sm:grid-cols-3">
            <Champ label="Situation"><Select name="situationFamiliale" defaultValue={s.situationFamiliale} options={SITUATIONS_FAMILIALES} /></Champ>
            {t({ name: 'nombreEnfants', label: "Nombre d'enfants", type: 'number' })}
            {t({ name: 'personnesACharge', label: 'Personnes à charge (IR)', type: 'number', aide: 'Conjoint sans revenu + enfants à charge, 6 max.' })}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {t({ name: 'adresse', label: 'Adresse' })}
            {t({ name: 'ville', label: 'Ville' })}
            {t({ name: 'telephone', label: 'Téléphone' })}
            {t({ name: 'email', label: 'E-mail', type: 'email' })}
          </div>
        </Card>
        <Card titre="Contrat de travail">
          <div className="grid gap-3 sm:grid-cols-3">
            <Champ label="Type de contrat"><Select name="typeContrat" defaultValue={s.typeContrat} options={Object.entries(LIBELLES_CONTRAT)} /></Champ>
            {t({ name: 'dateEmbauche', label: "Date d'embauche", type: 'date', required: true })}
            {t({ name: 'dateAnciennete', label: "Date d'ancienneté", type: 'date', aide: "Par défaut : date d'embauche" })}
            {t({ name: 'dateFinContrat', label: 'Fin de contrat (CDD…)', type: 'date' })}
            {t({ name: 'poste', label: 'Poste / fonction' })}
            {t({ name: 'departement', label: 'Service / département' })}
            {t({ name: 'categorie', label: 'Catégorie professionnelle' })}
            {t({ name: 'dateSortie', label: 'Date de sortie', type: 'date' })}
            {t({ name: 'motifSortie', label: 'Motif de sortie' })}
          </div>
          <div className="mt-3">{c({ name: 'actif', label: 'Salarié actif' })}</div>
        </Card>
        <Card titre="Rémunération et paiement">
          <div className="grid gap-3 sm:grid-cols-3">
            <Champ label="Type de salaire"><Select name="typeSalaire" defaultValue={s.typeSalaire} options={[['MENSUEL', 'Mensuel'], ['HORAIRE', 'Horaire']]} /></Champ>
            {t({ name: 'salaireBase', label: 'Salaire de base / taux horaire', type: 'number', aide: 'Mensuel en DH, ou DH/heure si horaire' })}
            {t({ name: 'horaireMensuel', label: 'Horaire mensuel (h)', type: 'number', aide: '191 h (44 h/semaine)' })}
            <Champ label="Mode de paiement"><Select name="modePaiement" defaultValue={s.modePaiement} options={[['VIREMENT', 'Virement'], ['CHEQUE', 'Chèque'], ['ESPECES', 'Espèces']]} /></Champ>
            {t({ name: 'banque', label: 'Banque' })}
            {t({ name: 'rib', label: 'RIB (24 chiffres)' })}
            {t({ name: 'soldeCongesInitial', label: 'Reliquat de congés à la reprise (j)', type: 'number' })}
          </div>
        </Card>
        <Card titre="Immatriculations, cotisations et fiscalité">
          <div className="grid gap-3 sm:grid-cols-3">
            {t({ name: 'numeroCnss', label: 'N° immatriculation CNSS', aide: '9 chiffres' })}
            {t({ name: 'numeroCimr', label: 'N° CIMR' })}
            {t({ name: 'tauxCimr', label: 'Taux CIMR salarial %', type: 'number', aide: 'De 3 % à 10 % ; patronal × ratio' })}
            {t({ name: 'tauxMutuelleSalarial', label: 'Mutuelle salariale %', type: 'number' })}
            {t({ name: 'tauxMutuellePatronal', label: 'Mutuelle patronale %', type: 'number' })}
            {t({ name: 'interetsLogement', label: 'Intérêts prêt logement (DH/mois)', type: 'number', aide: 'Habitation principale, déductibles ≤ 10 % du SBI' })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4">
            {c({ name: 'affilieCimr', label: 'Affilié à la CIMR' })}
            {c({ name: 'exonereIr', label: "Exonéré d'IR" })}
            {c({ name: 'exonereCnss', label: 'Exonéré de CNSS / AMO' })}
          </div>
          <div className="mt-3">{t({ name: 'motifExoneration', label: "Motif d'exonération (ANAPEC Idmaj, Tahfiz…)" })}</div>
        </Card>
        <Card titre="Éléments fixes mensuels (primes, indemnités, avantages, retenues)">
          <EditeurElements prefixe="ef" rubriques={rubriques.filter((r) => r.actif)} initial={s.elementsFixes} />
          <p className="mt-3 text-xs text-gray-500">Repris automatiquement chaque mois. Les éléments ponctuels se saisissent dans la période de paie.</p>
        </Card>
      </div>
      <Bouton type="submit">Enregistrer le salarié</Bouton>
    </form>
  )
}
