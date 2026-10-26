import { ancienneteDecimale, indemniteLicenciement, round2 } from './calcul'
import type { BaseDonnees, ElementFixe, Salarie } from './types'

export type MotifSortie = 'DEMISSION' | 'LICENCIEMENT' | 'FAUTE_GRAVE' | 'FIN_CDD' | 'RUPTURE_CONVENTIONNELLE' | 'RETRAITE'

export const MOTIFS_SORTIE: [MotifSortie, string][] = [
  ['DEMISSION', 'Démission'],
  ['LICENCIEMENT', 'Licenciement (motif économique ou personnel)'],
  ['FAUTE_GRAVE', 'Licenciement pour faute grave'],
  ['FIN_CDD', 'Fin de contrat à durée déterminée'],
  ['RUPTURE_CONVENTIONNELLE', 'Départ négocié / rupture amiable'],
  ['RETRAITE', 'Départ à la retraite'],
]

export interface ParamsStc {
  dateSortie: string
  motif: MotifSortie
  moisPreavis: number // préavis non effectué, payé par l'employeur
  joursCongesRestants: number
  abusif: boolean // dommages-intérêts art. 41
}

/** Préavis légal indicatif (décret n° 2-04-469) en mois. */
export function preavisLegal(s: Salarie, dateSortie: string): number {
  const anc = ancienneteDecimale(s.dateEmbauche, dateSortie)
  const cadre = /cadre/i.test(s.categorie)
  if (cadre) return anc < 1 ? 1 : anc <= 5 ? 2 : 3
  return anc < 1 ? 8 / 26 : anc <= 5 ? 1 : 2
}

/** Salaire mensuel moyen des 12 derniers bulletins (hors indemnités exonérées). */
export function salaireMoyen(db: BaseDonnees, s: Salarie): number {
  const bulletins = db.periodes
    .filter((p) => p.bulletins[s.id])
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 12)
    .map((p) => p.bulletins[s.id])
  if (!bulletins.length) return s.typeSalaire === 'HORAIRE' ? s.salaireBase * s.horaireMensuel : s.salaireBase
  return round2(bulletins.reduce((a, b) => a + b.brutImposable - b.avantagesNature, 0) / bulletins.length)
}

export function calculerSoldeToutCompte(db: BaseDonnees, s: Salarie, p: ParamsStc) {
  const moyen = salaireMoyen(db, s)
  const anciennete = ancienneteDecimale(s.dateAnciennete || s.dateEmbauche, p.dateSortie)
  const journalier = moyen / db.parametres.joursOuvrablesMois
  const droitIndemnite = ['LICENCIEMENT', 'RUPTURE_CONVENTIONNELLE'].includes(p.motif) && anciennete >= 0.5
  const licenciement = droitIndemnite
    ? indemniteLicenciement(anciennete, moyen, s.horaireMensuel || db.parametres.heuresMensuellesLegales)
    : { heures: 0, tauxHoraire: 0, montant: 0 }
  const conges = round2(Math.max(0, p.joursCongesRestants) * journalier)
  const preavis = p.motif === 'FAUTE_GRAVE' ? 0 : round2(p.moisPreavis * moyen)
  const moisDommages = p.abusif ? Math.min(36, anciennete * 1.5) : 0
  const dommages = round2(moisDommages * moyen)

  const elements: ElementFixe[] = [
    { code: '206', montant: conges },
    { code: '207', montant: preavis },
    { code: '311', montant: licenciement.montant },
    { code: '312', montant: dommages },
  ].filter((e) => e.montant > 0)

  return {
    salaireMoyen: moyen,
    anciennete: round2(anciennete),
    journalier: round2(journalier),
    conges,
    preavis,
    licenciement,
    moisDommages: round2(moisDommages),
    dommages,
    elements,
    totalBrut: round2(conges + preavis + licenciement.montant + dommages),
  }
}
