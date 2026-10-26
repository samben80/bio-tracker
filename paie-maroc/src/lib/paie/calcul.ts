import type {
  Bulletin,
  ElementFixe,
  Exoneration,
  LigneBulletin,
  ParametresLegaux,
  Rubrique,
  Salarie,
  VariablesMois,
} from './types'

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function finDeMois(annee: number, mois: number): Date {
  return new Date(Date.UTC(annee, mois, 0))
}

/** Nombre d'années révolues entre deux dates (ISO AAAA-MM-JJ). */
export function anneesRevolues(depuis: string, jusqua: Date): number {
  if (!depuis) return 0
  const d = new Date(depuis + 'T00:00:00Z')
  let ans = jusqua.getUTCFullYear() - d.getUTCFullYear()
  const avantAnniversaire =
    jusqua.getUTCMonth() < d.getUTCMonth() ||
    (jusqua.getUTCMonth() === d.getUTCMonth() && jusqua.getUTCDate() < d.getUTCDate())
  if (avantAnniversaire) ans--
  return Math.max(0, ans)
}

/** Ancienneté en années décimales (pour les indemnités de rupture). */
export function ancienneteDecimale(depuis: string, jusqua: string): number {
  if (!depuis || !jusqua) return 0
  const ms = new Date(jusqua + 'T00:00:00Z').getTime() - new Date(depuis + 'T00:00:00Z').getTime()
  return Math.max(0, ms / (365.25 * 24 * 3600 * 1000))
}

export function tauxAnciennete(annees: number, p: ParametresLegaux): number {
  let taux = 0
  for (const t of p.anciennete) if (annees >= t.anneesMin) taux = Math.max(taux, t.taux)
  return taux
}

/** IR mensuel brut (avant charges de famille) à partir du net imposable mensuel. */
export function irBrutMensuel(netImposableMensuel: number, p: ParametresLegaux): number {
  const annuel = netImposableMensuel * 12
  const tranche =
    p.bareme.find((t) => annuel > t.min && (t.max === null || annuel <= t.max)) ?? p.bareme[0]
  return Math.max(0, (annuel * tranche.taux) / 100 - tranche.deduction) / 12
}

export function tauxMarginalIr(netImposableMensuel: number, p: ParametresLegaux): number {
  const annuel = netImposableMensuel * 12
  return (p.bareme.find((t) => annuel > t.min && (t.max === null || annuel <= t.max)) ?? p.bareme[0]).taux
}

export function fraisProfessionnelsMensuels(sbi: number, baseFp: number, p: ParametresLegaux): number {
  const fp = p.fraisProfessionnels
  const taux = sbi * 12 <= fp.seuilAnnuel ? fp.tauxSousSeuil : fp.tauxAuDela
  return Math.min((Math.max(0, baseFp) * taux) / 100, fp.plafondAnnuel / 12)
}

interface ContexteExo {
  salaireBase: number
  joursTravailles: number
  smigHoraire: number
}

/** Part exonérée d'un montant selon la règle d'exonération de la rubrique. */
export function partExoneree(montant: number, exo: Exoneration, ctx: ContexteExo): number {
  switch (exo.type) {
    case 'AUCUN':
      return 0
    case 'TOTAL':
      return montant
    case 'MONTANT':
      return Math.min(montant, exo.valeur)
    case 'POURCENT_BASE':
      return Math.min(montant, (ctx.salaireBase * exo.valeur) / 100)
    case 'SMIG_HORAIRE_PAR_JOUR':
      return Math.min(montant, exo.valeur * ctx.smigHoraire * ctx.joursTravailles)
  }
}

/** Jours de congé payé acquis pour un mois complet (art. 231 et 241 du Code du travail). */
export function congesAcquisMensuels(s: Salarie, dateRef: Date): number {
  const age = anneesRevolues(s.dateNaissance, dateRef)
  const base = s.dateNaissance && age < 18 ? 2 : 1.5
  const bonus = Math.floor(anneesRevolues(s.dateAnciennete || s.dateEmbauche, dateRef) / 5) * 1.5
  // le congé annuel total ne peut excéder 30 jours ouvrables
  return Math.min(base + bonus / 12, 30 / 12)
}

/** Jours payés par défaut : mois complet, proratisé en cas d'entrée ou de sortie dans le mois. */
export function joursPayesParDefaut(s: Salarie, p: ParametresLegaux, periode?: string): number {
  const jo = p.joursOuvrablesMois
  if (!periode) return jo
  const [a, m] = periode.split('-').map(Number)
  const nbJours = new Date(Date.UTC(a, m, 0)).getUTCDate()
  const debut = s.dateEmbauche?.startsWith(periode) ? Number(s.dateEmbauche.slice(8, 10)) : 1
  const fin = s.dateSortie?.startsWith(periode) ? Number(s.dateSortie.slice(8, 10)) : nbJours
  return Math.max(0, Math.min(jo, Math.round(((fin - debut + 1) * jo) / nbJours)))
}

export function variablesParDefaut(s: Salarie, p: ParametresLegaux, periode?: string): VariablesMois {
  return {
    joursTravailles: joursPayesParDefaut(s, p, periode),
    heuresTravaillees: s.horaireMensuel || p.heuresMensuellesLegales,
    joursAbsenceNonPayee: 0,
    joursConges: 0,
    hs25: 0,
    hs50: 0,
    hs100: 0,
    elements: [],
    avance: 0,
    situationCnss: '',
  }
}

export function fusionnerElements(fixes: ElementFixe[], variables: ElementFixe[]): ElementFixe[] {
  const res = new Map<string, number>()
  for (const e of [...fixes, ...variables]) {
    if (!e.code || !e.montant) continue
    res.set(e.code, round2((res.get(e.code) ?? 0) + e.montant))
  }
  return [...res.entries()].map(([code, montant]) => ({ code, montant }))
}

export function calculerBulletin(
  s: Salarie,
  v: VariablesMois,
  periode: string,
  p: ParametresLegaux,
  rubriques: Rubrique[],
): Bulletin {
  const [annee, mois] = periode.split('-').map(Number)
  const dateRef = finDeMois(annee, mois)
  const lignes: LigneBulletin[] = []
  const jo = p.joursOuvrablesMois
  const horaire = s.horaireMensuel || p.heuresMensuellesLegales

  // 1. Salaire de base
  let salaireBase: number
  let tauxHoraire: number
  if (s.typeSalaire === 'HORAIRE') {
    tauxHoraire = s.salaireBase
    salaireBase = round2(tauxHoraire * v.heuresTravaillees)
    lignes.push({ code: '100', libelle: 'Salaire de base', base: v.heuresTravaillees, taux: tauxHoraire, gain: salaireBase })
  } else {
    tauxHoraire = s.salaireBase / horaire
    const jours = Math.min(v.joursTravailles, jo)
    salaireBase = round2(jours >= jo ? s.salaireBase : (s.salaireBase * jours) / jo)
    lignes.push({ code: '100', libelle: 'Salaire de base', base: jours, taux: round2(s.salaireBase / jo), gain: salaireBase })
  }

  let absence = 0
  if (v.joursAbsenceNonPayee > 0) {
    const journalier = s.typeSalaire === 'HORAIRE' ? tauxHoraire * (horaire / jo) : s.salaireBase / jo
    absence = round2(Math.min(salaireBase, journalier * v.joursAbsenceNonPayee))
    lignes.push({ code: '105', libelle: 'Absences non rémunérées', base: v.joursAbsenceNonPayee, taux: round2(journalier), gain: -absence })
  }

  // 2. Heures supplémentaires (art. 201 du Code du travail)
  let heuresSup = 0
  const hs: [string, string, number, number][] = [
    ['110', `Heures sup. ${p.tauxHeuresSup.hs25} %`, v.hs25, p.tauxHeuresSup.hs25],
    ['111', `Heures sup. ${p.tauxHeuresSup.hs50} %`, v.hs50, p.tauxHeuresSup.hs50],
    ['112', `Heures sup. ${p.tauxHeuresSup.hs100} %`, v.hs100, p.tauxHeuresSup.hs100],
  ]
  for (const [code, libelle, nb, maj] of hs) {
    if (!nb) continue
    const taux = round2(tauxHoraire * (1 + maj / 100))
    const montant = round2(taux * nb)
    heuresSup += montant
    lignes.push({ code, libelle, base: nb, taux, gain: montant })
  }

  // 3. Éléments de rémunération (fixes + variables)
  const elements = fusionnerElements(s.elementsFixes, v.elements)
  const rubrique = (code: string) => rubriques.find((r) => r.code === code)
  const joursEffectifs = Math.max(0, Math.min(v.joursTravailles, jo) - v.joursAbsenceNonPayee)
  const ctx: ContexteExo = { salaireBase: s.salaireBase, joursTravailles: joursEffectifs, smigHoraire: p.smigHoraire }

  const primesAnciennete = elements
    .filter((e) => rubrique(e.code)?.sens === 'GAIN' && rubrique(e.code)?.entreDansAnciennete)
    .reduce((a, e) => a + e.montant, 0)

  // 4. Prime d'ancienneté (art. 350)
  const annees = anneesRevolues(s.dateAnciennete || s.dateEmbauche, dateRef)
  const tauxAnc = tauxAnciennete(annees, p)
  let primeAnc = 0
  if (tauxAnc > 0) {
    const baseAnc = salaireBase - absence + heuresSup + primesAnciennete
    primeAnc = round2((baseAnc * tauxAnc) / 100)
    lignes.push({ code: '120', libelle: `Prime d'ancienneté (${annees} ans)`, base: round2(baseAnc), taux: tauxAnc, gain: primeAnc })
  }

  let brut = salaireBase - absence + heuresSup + primeAnc
  let exoIr = 0
  let exoCnss = 0
  let baseCimr = brut
  let avantagesNature = 0
  let retenuesNet = 0
  const lignesRetenues: LigneBulletin[] = []

  for (const e of elements) {
    const r = rubrique(e.code)
    if (!r) continue
    if (r.sens === 'RETENUE') {
      retenuesNet += e.montant
      lignesRetenues.push({ code: r.code, libelle: r.libelle, retenue: e.montant })
      continue
    }
    brut += e.montant
    exoIr += partExoneree(e.montant, r.exonerationIr, ctx)
    exoCnss += partExoneree(e.montant, r.exonerationCnss, ctx)
    if (r.soumisCimr) baseCimr += e.montant
    if (r.nature === 'AVANTAGE_NATURE') avantagesNature += e.montant
    lignes.push({ code: r.code, libelle: r.libelle, gain: e.montant })
  }

  brut = round2(brut)
  const brutImposable = round2(brut - exoIr)
  const baseCnss = s.exonereCnss ? 0 : round2(brut - exoCnss)
  const baseCnssPlafonnee = Math.min(baseCnss, p.cnss.plafondMensuel)
  baseCimr = s.affilieCimr ? round2(baseCimr) : 0

  // 5. Cotisations salariales et patronales
  const c = p.cnss
  const pct = (base: number, taux: number) => round2((base * taux) / 100)
  const cnssSalarial = pct(baseCnssPlafonnee, c.prestationsSocialesSalarial)
  const amoSalarial = pct(baseCnss, c.amoSalarial)
  const cimrSalarial = pct(baseCimr, s.tauxCimr)
  const tauxCimrPatronal = round2(s.tauxCimr * p.cimrRatioPatronal)
  const mutuelleSalarial = pct(brutImposable, s.tauxMutuelleSalarial)

  const patronal = {
    prestationsSociales: pct(baseCnssPlafonnee, c.prestationsSocialesPatronal),
    allocationsFamiliales: pct(baseCnss, c.allocationsFamilialesPatronal),
    formationProfessionnelle: pct(baseCnss, c.formationProfessionnellePatronal),
    amo: pct(baseCnss, c.amoPatronal),
    amoParticipation: pct(baseCnss, c.amoParticipationPatronal),
    cimr: pct(baseCimr, tauxCimrPatronal),
    mutuelle: pct(brutImposable, s.tauxMutuellePatronal),
    total: 0,
  }
  patronal.total = round2(
    patronal.prestationsSociales + patronal.allocationsFamiliales + patronal.formationProfessionnelle +
      patronal.amo + patronal.amoParticipation + patronal.cimr + patronal.mutuelle,
  )

  if (baseCnss > 0) {
    lignes.push({ code: '600', libelle: 'CNSS - Prestations sociales', base: baseCnssPlafonnee, taux: c.prestationsSocialesSalarial, retenue: cnssSalarial, tauxPatronal: c.prestationsSocialesPatronal, patronal: patronal.prestationsSociales })
    lignes.push({ code: '601', libelle: 'AMO - Assurance maladie obligatoire', base: baseCnss, taux: c.amoSalarial, retenue: amoSalarial, tauxPatronal: c.amoPatronal, patronal: patronal.amo })
    lignes.push({ code: '602', libelle: 'Participation AMO', base: baseCnss, tauxPatronal: c.amoParticipationPatronal, patronal: patronal.amoParticipation })
    lignes.push({ code: '603', libelle: 'Allocations familiales', base: baseCnss, tauxPatronal: c.allocationsFamilialesPatronal, patronal: patronal.allocationsFamiliales })
    lignes.push({ code: '604', libelle: 'Taxe de formation professionnelle', base: baseCnss, tauxPatronal: c.formationProfessionnellePatronal, patronal: patronal.formationProfessionnelle })
  }
  if (baseCimr > 0) {
    lignes.push({ code: '605', libelle: 'CIMR - Retraite complémentaire', base: baseCimr, taux: s.tauxCimr, retenue: cimrSalarial, tauxPatronal: tauxCimrPatronal, patronal: patronal.cimr })
  }
  if (mutuelleSalarial > 0 || patronal.mutuelle > 0) {
    lignes.push({ code: '606', libelle: 'Mutuelle / assurance maladie complémentaire', base: brutImposable, taux: s.tauxMutuelleSalarial, retenue: mutuelleSalarial, tauxPatronal: s.tauxMutuellePatronal, patronal: patronal.mutuelle })
  }

  const totalCotisationsSalariales = round2(cnssSalarial + amoSalarial + cimrSalarial + mutuelleSalarial)

  // 6. Impôt sur le revenu (art. 56 à 82 du CGI)
  const fraisProfessionnels = round2(fraisProfessionnelsMensuels(brutImposable, brutImposable - avantagesNature, p))
  const interetsLogement = round2(Math.min(s.interetsLogement || 0, (brutImposable * p.plafondInteretsLogementPct) / 100))
  const netImposable = round2(Math.max(0, brutImposable - fraisProfessionnels - totalCotisationsSalariales - interetsLogement))
  const irBrut = s.exonereIr ? 0 : round2(irBrutMensuel(netImposable, p))
  const pac = Math.min(s.personnesACharge, p.maxPersonnesACharge)
  const deductionsFamille = round2(Math.min(irBrut, (pac * p.deductionParPersonneACharge) / 12))
  const ir = round2(irBrut - deductionsFamille)
  if (ir > 0 || irBrut > 0) {
    lignes.push({ code: '700', libelle: 'Impôt sur le revenu', base: netImposable, taux: tauxMarginalIr(netImposable, p), retenue: ir })
  }

  // 7. Retenues sur net
  if (avantagesNature > 0) {
    lignes.push({ code: '790', libelle: 'Avantages en nature (non versés)', retenue: round2(avantagesNature) })
  }
  if (v.avance > 0) {
    retenuesNet += v.avance
    lignesRetenues.push({ code: '800', libelle: 'Avance sur salaire', retenue: v.avance })
  }
  lignes.push(...lignesRetenues)
  retenuesNet = round2(retenuesNet)

  let netAPayer = round2(brut - avantagesNature - totalCotisationsSalariales - ir - retenuesNet)
  let arrondi = 0
  if (p.arrondirNet && netAPayer > 0) {
    arrondi = round2(Math.ceil(netAPayer) - netAPayer)
    if (arrondi > 0) {
      netAPayer = round2(netAPayer + arrondi)
      lignes.push({ code: '900', libelle: 'Arrondi', gain: arrondi })
    }
  }

  const joursDeclaresCnss = Math.min(c.joursMaxDeclares, Math.round(joursEffectifs))
  const joursCongesAcquis = round2((congesAcquisMensuels(s, dateRef) * Math.min(v.joursTravailles, jo)) / jo)

  return {
    salarieId: s.id,
    periode,
    lignes,
    salaireBase,
    brut,
    brutImposable,
    baseCnss,
    baseCnssPlafonnee,
    baseCimr,
    cnssSalarial,
    amoSalarial,
    cimrSalarial,
    mutuelleSalarial,
    totalCotisationsSalariales,
    fraisProfessionnels,
    interetsLogement,
    netImposable,
    irBrut,
    deductionsFamille,
    ir,
    avantagesNature: round2(avantagesNature),
    retenuesNet,
    netAPayer,
    arrondi,
    patronal,
    coutEmployeur: round2(brut + patronal.total),
    joursDeclaresCnss,
    tauxAnciennete: tauxAnc,
    joursCongesAcquis,
    joursCongesPris: v.joursConges,
    calculeLe: new Date().toISOString(),
  }
}

/** Recherche du salaire de base mensuel donnant un net à payer cible (simulateur net → brut). */
export function salaireBasePourNet(
  netCible: number,
  s: Salarie,
  p: ParametresLegaux,
  rubriques: Rubrique[],
  periode: string,
): number {
  const v = variablesParDefaut(s, p)
  let bas = 0
  let haut = Math.max(1000, netCible * 3)
  for (let i = 0; i < 80; i++) {
    const milieu = (bas + haut) / 2
    const b = calculerBulletin({ ...s, typeSalaire: 'MENSUEL', salaireBase: milieu }, v, periode, p, rubriques)
    if (b.netAPayer < netCible) bas = milieu
    else haut = milieu
  }
  return round2(haut)
}

/** Indemnité légale de licenciement (art. 53 du Code du travail). */
export function indemniteLicenciement(anneesService: number, salaireMensuelMoyen: number, heuresMensuelles: number) {
  const tauxHoraire = salaireMensuelMoyen / heuresMensuelles
  const tranches: [number, number][] = [
    [5, 96],
    [5, 144],
    [5, 192],
    [Infinity, 240],
  ]
  let restant = anneesService
  let heures = 0
  for (const [duree, h] of tranches) {
    const part = Math.min(restant, duree)
    if (part <= 0) break
    heures += part * h
    restant -= part
  }
  return { heures: round2(heures), tauxHoraire: round2(tauxHoraire), montant: round2(heures * tauxHoraire) }
}
