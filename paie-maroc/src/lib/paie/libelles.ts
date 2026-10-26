import type { Exoneration, TypeContrat } from './types'

export function libelleExo(e: Exoneration) {
  switch (e.type) {
    case 'AUCUN': return 'Soumis'
    case 'TOTAL': return 'Exonéré'
    case 'MONTANT': return `Exo. ≤ ${e.valeur} DH`
    case 'POURCENT_BASE': return `Exo. ≤ ${e.valeur} % base`
    case 'SMIG_HORAIRE_PAR_JOUR': return `Exo. ≤ ${e.valeur} × SMIG h/j`
  }
}

export const LIBELLES_CONTRAT: Record<TypeContrat, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  ANAPEC: 'Contrat d\'insertion ANAPEC',
  STAGE: 'Stage',
  INTERIM: 'Intérim',
  SAISONNIER: 'Saisonnier',
}

export const SITUATIONS_FAMILIALES: [string, string][] = [
  ['C', 'Célibataire'],
  ['M', 'Marié(e)'],
  ['D', 'Divorcé(e)'],
  ['V', 'Veuf(ve)'],
]
