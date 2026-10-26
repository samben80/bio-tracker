import type { ParametresLegaux, Rubrique, Societe } from './types'

// Paramètres légaux par défaut. Sources : Code du travail, CGI (art. 56 à 82),
// Loi de finances 2025 (barème IR, charges de famille), taux CNSS/AMO en vigueur.
// Toutes les valeurs restent modifiables dans l'écran « Paramètres légaux ».
export const PARAMETRES_DEFAUT: ParametresLegaux = {
  libelle: 'Paramètres 2026 (barème IR LF 2025)',
  cnss: {
    plafondMensuel: 6000,
    prestationsSocialesSalarial: 4.48,
    prestationsSocialesPatronal: 8.98,
    allocationsFamilialesPatronal: 6.4,
    formationProfessionnellePatronal: 1.6,
    amoSalarial: 2.26,
    amoPatronal: 2.26,
    amoParticipationPatronal: 1.85,
    joursMaxDeclares: 26,
  },
  fraisProfessionnels: {
    seuilAnnuel: 78000,
    tauxSousSeuil: 35,
    tauxAuDela: 25,
    plafondAnnuel: 35000,
  },
  bareme: [
    { min: 0, max: 40000, taux: 0, deduction: 0 },
    { min: 40000, max: 60000, taux: 10, deduction: 4000 },
    { min: 60000, max: 80000, taux: 20, deduction: 10000 },
    { min: 80000, max: 100000, taux: 30, deduction: 18000 },
    { min: 100000, max: 180000, taux: 34, deduction: 22000 },
    { min: 180000, max: null, taux: 37, deduction: 27400 },
  ],
  deductionParPersonneACharge: 500,
  maxPersonnesACharge: 6,
  smigHoraire: 17.92,
  heuresMensuellesLegales: 191,
  joursOuvrablesMois: 26,
  tauxHeuresSup: { hs25: 25, hs50: 50, hs100: 100 },
  // Art. 350 du Code du travail
  anciennete: [
    { anneesMin: 2, taux: 5 },
    { anneesMin: 5, taux: 10 },
    { anneesMin: 12, taux: 15 },
    { anneesMin: 20, taux: 20 },
    { anneesMin: 25, taux: 25 },
  ],
  cimrRatioPatronal: 1.3,
  plafondInteretsLogementPct: 10,
  arrondirNet: false,
}

const soumis = { type: 'AUCUN' as const, valeur: 0 }
const exonere = { type: 'TOTAL' as const, valeur: 0 }

// Rubriques usuelles. Les plafonds d'exonération reprennent la doctrine
// administrative (DGI) et le barème CNSS des éléments exclus de l'assiette.
export const RUBRIQUES_DEFAUT: Rubrique[] = [
  { code: '200', libelle: 'Prime de rendement', sens: 'GAIN', nature: 'PRIME', exonerationIr: soumis, exonerationCnss: soumis, soumisCimr: true, entreDansAnciennete: false, actif: true },
  { code: '201', libelle: 'Prime de fin d\'année / 13e mois', sens: 'GAIN', nature: 'PRIME', exonerationIr: soumis, exonerationCnss: soumis, soumisCimr: true, entreDansAnciennete: false, actif: true },
  { code: '202', libelle: 'Commissions sur ventes', sens: 'GAIN', nature: 'PRIME', exonerationIr: soumis, exonerationCnss: soumis, soumisCimr: true, entreDansAnciennete: false, actif: true },
  { code: '203', libelle: 'Prime de responsabilité', sens: 'GAIN', nature: 'PRIME', exonerationIr: soumis, exonerationCnss: soumis, soumisCimr: true, entreDansAnciennete: true, actif: true },
  { code: '204', libelle: 'Gratification exceptionnelle', sens: 'GAIN', nature: 'PRIME', exonerationIr: soumis, exonerationCnss: soumis, soumisCimr: true, entreDansAnciennete: false, actif: true },
  { code: '205', libelle: 'Rappel de salaire', sens: 'GAIN', nature: 'PRIME', exonerationIr: soumis, exonerationCnss: soumis, soumisCimr: true, entreDansAnciennete: false, actif: true },
  { code: '206', libelle: 'Indemnité compensatrice de congés payés', sens: 'GAIN', nature: 'PRIME', exonerationIr: soumis, exonerationCnss: soumis, soumisCimr: true, entreDansAnciennete: false, actif: true },
  { code: '207', libelle: 'Indemnité compensatrice de préavis', sens: 'GAIN', nature: 'PRIME', exonerationIr: soumis, exonerationCnss: soumis, soumisCimr: true, entreDansAnciennete: false, actif: true },
  { code: '300', libelle: 'Indemnité de transport', sens: 'GAIN', nature: 'INDEMNITE', exonerationIr: { type: 'MONTANT', valeur: 500 }, exonerationCnss: { type: 'MONTANT', valeur: 500 }, soumisCimr: false, entreDansAnciennete: false, actif: true, description: 'Exonérée dans la limite de 500 DH/mois (périmètre urbain), 750 DH hors périmètre.' },
  { code: '301', libelle: 'Indemnité kilométrique', sens: 'GAIN', nature: 'INDEMNITE', exonerationIr: exonere, exonerationCnss: exonere, soumisCimr: false, entreDansAnciennete: false, actif: true, description: 'Frais réels justifiés (véhicule personnel, déplacements professionnels).' },
  { code: '302', libelle: 'Prime de panier', sens: 'GAIN', nature: 'INDEMNITE', exonerationIr: { type: 'SMIG_HORAIRE_PAR_JOUR', valeur: 2 }, exonerationCnss: { type: 'SMIG_HORAIRE_PAR_JOUR', valeur: 2 }, soumisCimr: false, entreDansAnciennete: false, actif: true, description: 'Exonérée dans la limite de 2 fois le SMIG horaire par jour travaillé.' },
  { code: '303', libelle: 'Indemnité de représentation', sens: 'GAIN', nature: 'INDEMNITE', exonerationIr: { type: 'POURCENT_BASE', valeur: 10 }, exonerationCnss: { type: 'POURCENT_BASE', valeur: 10 }, soumisCimr: false, entreDansAnciennete: false, actif: true, description: 'Cadres dirigeants : exonérée dans la limite de 10 % du salaire de base.' },
  { code: '304', libelle: 'Indemnité de caisse', sens: 'GAIN', nature: 'INDEMNITE', exonerationIr: { type: 'MONTANT', valeur: 190 }, exonerationCnss: { type: 'MONTANT', valeur: 239 }, soumisCimr: false, entreDansAnciennete: false, actif: true },
  { code: '305', libelle: 'Indemnité de tournée', sens: 'GAIN', nature: 'INDEMNITE', exonerationIr: { type: 'MONTANT', valeur: 1500 }, exonerationCnss: { type: 'MONTANT', valeur: 1500 }, soumisCimr: false, entreDansAnciennete: false, actif: true },
  { code: '306', libelle: 'Prime de lait', sens: 'GAIN', nature: 'INDEMNITE', exonerationIr: { type: 'MONTANT', valeur: 150 }, exonerationCnss: { type: 'MONTANT', valeur: 150 }, soumisCimr: false, entreDansAnciennete: false, actif: true },
  { code: '307', libelle: 'Prime d\'outillage', sens: 'GAIN', nature: 'INDEMNITE', exonerationIr: { type: 'MONTANT', valeur: 100 }, exonerationCnss: { type: 'MONTANT', valeur: 119 }, soumisCimr: false, entreDansAnciennete: false, actif: true },
  { code: '308', libelle: 'Prime de salissure', sens: 'GAIN', nature: 'INDEMNITE', exonerationIr: { type: 'MONTANT', valeur: 210 }, exonerationCnss: { type: 'MONTANT', valeur: 210 }, soumisCimr: false, entreDansAnciennete: false, actif: true },
  { code: '309', libelle: 'Indemnité de stage (ANAPEC)', sens: 'GAIN', nature: 'INDEMNITE', exonerationIr: { type: 'MONTANT', valeur: 6000 }, exonerationCnss: { type: 'MONTANT', valeur: 6000 }, soumisCimr: false, entreDansAnciennete: false, actif: true, description: 'Contrat d\'insertion (Idmaj) : exonération dans la limite de 6 000 DH/mois.' },
  { code: '310', libelle: 'Aide médicale / frais justifiés', sens: 'GAIN', nature: 'INDEMNITE', exonerationIr: exonere, exonerationCnss: exonere, soumisCimr: false, entreDansAnciennete: false, actif: true },
  { code: '311', libelle: 'Indemnité légale de licenciement', sens: 'GAIN', nature: 'INDEMNITE', exonerationIr: exonere, exonerationCnss: exonere, soumisCimr: false, entreDansAnciennete: false, actif: true, description: 'Exonérée dans la limite du barème légal (art. 53 du Code du travail).' },
  { code: '312', libelle: 'Dommages et intérêts (art. 41)', sens: 'GAIN', nature: 'INDEMNITE', exonerationIr: exonere, exonerationCnss: exonere, soumisCimr: false, entreDansAnciennete: false, actif: true, description: 'Exonérés dans la limite de 1,5 mois par année d\'ancienneté (36 mois max), sur décision judiciaire ou accord.' },
  { code: '400', libelle: 'Avantage en nature - logement', sens: 'GAIN', nature: 'AVANTAGE_NATURE', exonerationIr: soumis, exonerationCnss: soumis, soumisCimr: false, entreDansAnciennete: false, actif: true, description: 'Imposable, non versé en espèces (déduit du net).' },
  { code: '401', libelle: 'Avantage en nature - véhicule', sens: 'GAIN', nature: 'AVANTAGE_NATURE', exonerationIr: soumis, exonerationCnss: soumis, soumisCimr: false, entreDansAnciennete: false, actif: true },
  { code: '500', libelle: 'Remboursement de prêt', sens: 'RETENUE', nature: 'RETENUE_NET', exonerationIr: exonere, exonerationCnss: exonere, soumisCimr: false, entreDansAnciennete: false, actif: true },
  { code: '501', libelle: 'Saisie-arrêt sur salaire', sens: 'RETENUE', nature: 'RETENUE_NET', exonerationIr: exonere, exonerationCnss: exonere, soumisCimr: false, entreDansAnciennete: false, actif: true },
  { code: '502', libelle: 'Retenue diverse', sens: 'RETENUE', nature: 'RETENUE_NET', exonerationIr: exonere, exonerationCnss: exonere, soumisCimr: false, entreDansAnciennete: false, actif: true },
]

export const SOCIETE_VIDE: Societe = {
  raisonSociale: '',
  formeJuridique: 'SARL',
  activite: '',
  adresse: '',
  ville: '',
  codePostal: '',
  telephone: '',
  email: '',
  ice: '',
  identifiantFiscal: '',
  registreCommerce: '',
  taxeProfessionnelle: '',
  cnssAffiliation: '',
  cnssCodeAgence: '',
  cimrAdherent: '',
  banque: '',
  rib: '',
  representantLegal: '',
  qualiteRepresentant: 'Gérant',
  codeCommune: '',
}

export const TYPES_DOCUMENTS = [
  'Copie CIN',
  'Contrat de travail',
  'Attestation CNSS / immatriculation',
  'Relevé d\'identité bancaire (RIB)',
  'Diplômes',
  'Certificat de résidence',
  'Fiche anthropométrique',
  'Acte de mariage',
  'Extraits d\'acte de naissance des enfants',
  'Certificat médical d\'aptitude',
  'Photos d\'identité',
  'Carte de séjour (étranger)',
  'Visa contrat de travail étranger (ANAPEC)',
  'Permis de conduire',
]
