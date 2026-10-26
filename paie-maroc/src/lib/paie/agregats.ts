import { round2 } from './calcul'
import type { BaseDonnees, Bulletin, PeriodePaie } from './types'

export interface Totaux {
  effectif: number
  brut: number
  brutImposable: number
  baseCnss: number
  baseCnssPlafonnee: number
  baseCimr: number
  cnssSalarial: number
  amoSalarial: number
  cimrSalarial: number
  mutuelleSalarial: number
  fraisProfessionnels: number
  netImposable: number
  ir: number
  avantagesNature: number
  retenuesNet: number
  netAPayer: number
  arrondi: number
  patronalPrestations: number
  patronalAF: number
  patronalTFP: number
  patronalAMO: number
  patronalParticipationAMO: number
  patronalCimr: number
  patronalMutuelle: number
  patronalTotal: number
  coutEmployeur: number
  joursDeclares: number
}

export function totaliser(bulletins: Bulletin[]): Totaux {
  const t: Totaux = {
    effectif: bulletins.length, brut: 0, brutImposable: 0, baseCnss: 0, baseCnssPlafonnee: 0, baseCimr: 0,
    cnssSalarial: 0, amoSalarial: 0, cimrSalarial: 0, mutuelleSalarial: 0, fraisProfessionnels: 0,
    netImposable: 0, ir: 0, avantagesNature: 0, retenuesNet: 0, netAPayer: 0, arrondi: 0,
    patronalPrestations: 0, patronalAF: 0, patronalTFP: 0, patronalAMO: 0, patronalParticipationAMO: 0,
    patronalCimr: 0, patronalMutuelle: 0, patronalTotal: 0, coutEmployeur: 0, joursDeclares: 0,
  }
  for (const b of bulletins) {
    t.brut += b.brut
    t.brutImposable += b.brutImposable
    t.baseCnss += b.baseCnss
    t.baseCnssPlafonnee += b.baseCnssPlafonnee
    t.baseCimr += b.baseCimr
    t.cnssSalarial += b.cnssSalarial
    t.amoSalarial += b.amoSalarial
    t.cimrSalarial += b.cimrSalarial
    t.mutuelleSalarial += b.mutuelleSalarial
    t.fraisProfessionnels += b.fraisProfessionnels
    t.netImposable += b.netImposable
    t.ir += b.ir
    t.avantagesNature += b.avantagesNature
    t.retenuesNet += b.retenuesNet
    t.netAPayer += b.netAPayer
    t.arrondi += b.arrondi
    t.patronalPrestations += b.patronal.prestationsSociales
    t.patronalAF += b.patronal.allocationsFamiliales
    t.patronalTFP += b.patronal.formationProfessionnelle
    t.patronalAMO += b.patronal.amo
    t.patronalParticipationAMO += b.patronal.amoParticipation
    t.patronalCimr += b.patronal.cimr
    t.patronalMutuelle += b.patronal.mutuelle
    t.patronalTotal += b.patronal.total
    t.coutEmployeur += b.coutEmployeur
    t.joursDeclares += b.joursDeclaresCnss
  }
  for (const k of Object.keys(t) as (keyof Totaux)[]) t[k] = round2(t[k])
  return t
}

export const bulletinsDe = (p: PeriodePaie | undefined) => (p ? Object.values(p.bulletins) : [])

export function periodesAnnee(db: BaseDonnees, annee: number) {
  return db.periodes.filter((p) => p.annee === annee).sort((a, b) => a.mois - b.mois)
}

export interface CumulAnnuel {
  salarieId: string
  mois: number
  joursDeclares: number
  salaireBase: number
  brut: number
  brutImposable: number
  exonere: number
  avantagesNature: number
  fraisProfessionnels: number
  cotisations: number
  interetsLogement: number
  netImposable: number
  ir: number
  netAPayer: number
}

/** Cumuls par salarié sur une année (ou jusqu'à un mois donné inclus). */
export function cumulsAnnuels(db: BaseDonnees, annee: number, jusquAuMois = 12): Map<string, CumulAnnuel> {
  const res = new Map<string, CumulAnnuel>()
  for (const p of periodesAnnee(db, annee)) {
    if (p.mois > jusquAuMois) continue
    for (const b of Object.values(p.bulletins)) {
      const c = res.get(b.salarieId) ?? {
        salarieId: b.salarieId, mois: 0, joursDeclares: 0, salaireBase: 0, brut: 0, brutImposable: 0, exonere: 0,
        avantagesNature: 0, fraisProfessionnels: 0, cotisations: 0, interetsLogement: 0, netImposable: 0, ir: 0, netAPayer: 0,
      }
      c.mois++
      c.joursDeclares += b.joursDeclaresCnss
      c.salaireBase = round2(c.salaireBase + b.salaireBase)
      c.brut = round2(c.brut + b.brut)
      c.brutImposable = round2(c.brutImposable + b.brutImposable)
      c.exonere = round2(c.exonere + b.brut - b.brutImposable)
      c.avantagesNature = round2(c.avantagesNature + b.avantagesNature)
      c.fraisProfessionnels = round2(c.fraisProfessionnels + b.fraisProfessionnels)
      c.cotisations = round2(c.cotisations + b.totalCotisationsSalariales)
      c.interetsLogement = round2(c.interetsLogement + b.interetsLogement)
      c.netImposable = round2(c.netImposable + b.netImposable)
      c.ir = round2(c.ir + b.ir)
      c.netAPayer = round2(c.netAPayer + b.netAPayer)
      res.set(b.salarieId, c)
    }
  }
  return res
}

/** Solde de congés depuis la reprise, éventuellement arrêté à une période (incluse). */
export function soldeConges(db: BaseDonnees, salarieId: string, jusqua = '9999-12'): { acquis: number; pris: number; solde: number } {
  const s = db.salaries.find((x) => x.id === salarieId)
  let acquis = s?.soldeCongesInitial ?? 0
  let pris = 0
  for (const p of db.periodes) {
    const b = p.bulletins[salarieId]
    if (!b || p.id > jusqua) continue
    acquis += b.joursCongesAcquis
    pris += b.joursCongesPris
  }
  return { acquis: round2(acquis), pris: round2(pris), solde: round2(acquis - pris) }
}
