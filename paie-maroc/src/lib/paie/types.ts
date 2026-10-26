// Modèle de données du logiciel de paie (droit social et fiscal marocain).

export type SituationFamiliale = 'C' | 'M' | 'D' | 'V' // Célibataire, Marié, Divorcé, Veuf
export type TypeContrat = 'CDI' | 'CDD' | 'ANAPEC' | 'STAGE' | 'INTERIM' | 'SAISONNIER'
export type ModePaiement = 'VIREMENT' | 'CHEQUE' | 'ESPECES'
export type TypeSalaire = 'MENSUEL' | 'HORAIRE'

export interface Societe {
  raisonSociale: string
  formeJuridique: string
  activite: string
  adresse: string
  ville: string
  codePostal: string
  telephone: string
  email: string
  ice: string
  identifiantFiscal: string
  registreCommerce: string
  taxeProfessionnelle: string
  cnssAffiliation: string
  cnssCodeAgence: string
  cimrAdherent: string
  banque: string
  rib: string
  representantLegal: string
  qualiteRepresentant: string
  codeCommune: string
}

export interface TrancheIR {
  min: number // borne inférieure du revenu net imposable annuel
  max: number | null
  taux: number // en %
  deduction: number // somme à déduire annuelle
}

export interface TrancheAnciennete {
  anneesMin: number
  taux: number // en %
}

export interface ParametresLegaux {
  libelle: string
  cnss: {
    plafondMensuel: number
    prestationsSocialesSalarial: number
    prestationsSocialesPatronal: number
    allocationsFamilialesPatronal: number
    formationProfessionnellePatronal: number
    amoSalarial: number
    amoPatronal: number
    amoParticipationPatronal: number
    joursMaxDeclares: number
  }
  fraisProfessionnels: {
    seuilAnnuel: number // SBI annuel en dessous duquel le taux majoré s'applique
    tauxSousSeuil: number
    tauxAuDela: number
    plafondAnnuel: number
  }
  bareme: TrancheIR[]
  deductionParPersonneACharge: number // annuelle
  maxPersonnesACharge: number
  smigHoraire: number
  heuresMensuellesLegales: number
  joursOuvrablesMois: number
  tauxHeuresSup: { hs25: number; hs50: number; hs100: number }
  anciennete: TrancheAnciennete[]
  cimrRatioPatronal: number
  plafondInteretsLogementPct: number // % du SBI
  arrondirNet: boolean
}

export type TypePlafond = 'AUCUN' | 'MONTANT' | 'POURCENT_BASE' | 'SMIG_HORAIRE_PAR_JOUR' | 'TOTAL'

export interface Exoneration {
  type: TypePlafond // AUCUN = entièrement soumis, TOTAL = entièrement exonéré
  valeur: number
}

export interface Rubrique {
  code: string
  libelle: string
  sens: 'GAIN' | 'RETENUE'
  nature: 'PRIME' | 'INDEMNITE' | 'AVANTAGE_NATURE' | 'RETENUE_NET'
  exonerationIr: Exoneration
  exonerationCnss: Exoneration
  soumisCimr: boolean
  entreDansAnciennete: boolean
  actif: boolean
  description?: string
}

export interface ElementFixe {
  code: string
  montant: number
}

export type StatutDocument = 'FOURNI' | 'MANQUANT' | 'A_RENOUVELER'

export interface DocumentAdministratif {
  id: string
  type: string
  reference: string
  dateDelivrance: string
  dateExpiration: string
  statut: StatutDocument
  note: string
}

export interface Salarie {
  id: string
  matricule: string
  civilite: 'M.' | 'Mme' | 'Mlle'
  nom: string
  prenom: string
  sexe: 'M' | 'F'
  cin: string
  dateNaissance: string
  lieuNaissance: string
  nationalite: string
  situationFamiliale: SituationFamiliale
  nombreEnfants: number
  personnesACharge: number
  adresse: string
  ville: string
  telephone: string
  email: string
  numeroCnss: string
  numeroCimr: string
  // contrat
  typeContrat: TypeContrat
  dateEmbauche: string
  dateAnciennete: string
  dateFinContrat: string
  dateSortie: string
  motifSortie: string
  poste: string
  departement: string
  categorie: string
  // rémunération
  typeSalaire: TypeSalaire
  salaireBase: number // mensuel si MENSUEL, taux horaire si HORAIRE
  horaireMensuel: number
  modePaiement: ModePaiement
  banque: string
  rib: string
  affilieCimr: boolean
  tauxCimr: number // taux salarial en %
  tauxMutuelleSalarial: number
  tauxMutuellePatronal: number
  interetsLogement: number // mensuel, intérêts prêt acquisition logement principal
  exonereIr: boolean
  exonereCnss: boolean
  motifExoneration: string
  elementsFixes: ElementFixe[]
  documents: DocumentAdministratif[]
  soldeCongesInitial: number
  actif: boolean
}

export type SituationCnss = '' | 'SO' | 'DE' | 'IT' | 'IL' | 'AT' | 'CS' | 'MS' | 'MP'

export interface VariablesMois {
  joursTravailles: number
  heuresTravaillees: number // salariés horaires
  joursAbsenceNonPayee: number
  joursConges: number
  hs25: number
  hs50: number
  hs100: number
  elements: ElementFixe[] // primes/retenues variables du mois
  avance: number
  situationCnss: SituationCnss
}

export interface LigneBulletin {
  code: string
  libelle: string
  base?: number
  taux?: number
  gain?: number
  retenue?: number
  patronal?: number
  tauxPatronal?: number
}

export interface Bulletin {
  salarieId: string
  periode: string
  lignes: LigneBulletin[]
  salaireBase: number
  brut: number
  brutImposable: number
  baseCnss: number
  baseCnssPlafonnee: number
  baseCimr: number
  cnssSalarial: number
  amoSalarial: number
  cimrSalarial: number
  mutuelleSalarial: number
  totalCotisationsSalariales: number
  fraisProfessionnels: number
  interetsLogement: number
  netImposable: number
  irBrut: number
  deductionsFamille: number
  ir: number
  avantagesNature: number
  retenuesNet: number
  netAPayer: number
  arrondi: number
  patronal: {
    prestationsSociales: number
    allocationsFamiliales: number
    formationProfessionnelle: number
    amo: number
    amoParticipation: number
    cimr: number
    mutuelle: number
    total: number
  }
  coutEmployeur: number
  joursDeclaresCnss: number
  tauxAnciennete: number
  joursCongesAcquis: number
  joursCongesPris: number
  calculeLe: string
}

export type StatutPeriode = 'OUVERTE' | 'CALCULEE' | 'CLOTUREE'

export interface PeriodePaie {
  id: string // AAAA-MM
  annee: number
  mois: number
  statut: StatutPeriode
  variables: Record<string, VariablesMois>
  bulletins: Record<string, Bulletin>
  dateOuverture: string
  dateCloture?: string
}

export interface BaseDonnees {
  version: number
  societe: Societe
  parametres: ParametresLegaux
  rubriques: Rubrique[]
  salaries: Salarie[]
  periodes: PeriodePaie[]
}
