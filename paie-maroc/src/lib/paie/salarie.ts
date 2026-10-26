import type { Salarie } from './types'

export function nouveauSalarie(): Salarie {
  const aujourdhui = new Date().toISOString().slice(0, 10)
  return {
    id: '',
    matricule: '',
    civilite: 'M.',
    nom: '',
    prenom: '',
    sexe: 'M',
    cin: '',
    dateNaissance: '',
    lieuNaissance: '',
    nationalite: 'Marocaine',
    situationFamiliale: 'C',
    nombreEnfants: 0,
    personnesACharge: 0,
    adresse: '',
    ville: '',
    telephone: '',
    email: '',
    numeroCnss: '',
    numeroCimr: '',
    typeContrat: 'CDI',
    dateEmbauche: aujourdhui,
    dateAnciennete: '', // vide = date d'embauche
    dateFinContrat: '',
    dateSortie: '',
    motifSortie: '',
    poste: '',
    departement: '',
    categorie: 'Employé',
    typeSalaire: 'MENSUEL',
    salaireBase: 0,
    horaireMensuel: 191,
    modePaiement: 'VIREMENT',
    banque: '',
    rib: '',
    affilieCimr: false,
    tauxCimr: 6,
    tauxMutuelleSalarial: 0,
    tauxMutuellePatronal: 0,
    interetsLogement: 0,
    exonereIr: false,
    exonereCnss: false,
    motifExoneration: '',
    elementsFixes: [],
    documents: [],
    soldeCongesInitial: 0,
    actif: true,
  }
}

/** Personnes à charge par défaut : conjoint (si marié) + enfants, plafonné à 6. */
export function personnesAChargeParDefaut(s: Pick<Salarie, 'situationFamiliale' | 'nombreEnfants'>) {
  return Math.min(6, (s.situationFamiliale === 'M' ? 1 : 0) + s.nombreEnfants)
}

export const nomComplet = (s: Pick<Salarie, 'nom' | 'prenom'>) => `${s.nom.toUpperCase()} ${s.prenom}`

/** Salarié présent sur la période (entré avant la fin du mois, non sorti avant son début). */
export function presentSurPeriode(s: Salarie, periode: string): boolean {
  const debut = `${periode}-01`
  const [a, m] = periode.split('-').map(Number)
  const fin = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10)
  if (s.dateEmbauche && s.dateEmbauche > fin) return false
  if (s.dateSortie && s.dateSortie < debut) return false
  return s.actif || !!s.dateSortie
}
