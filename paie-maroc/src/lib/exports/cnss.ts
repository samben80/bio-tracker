import { round2 } from '../paie/calcul'
import { nomComplet } from '../paie/salarie'
import type { BaseDonnees, Bulletin, PeriodePaie, Salarie, SituationCnss } from '../paie/types'
import { alpha, centimes, num } from './format'

// Bordereau de Déclaration des Salaires (BDS) – fichier EDI DAMANCOM.
// Enregistrements de 260 caractères : B00 (entête transfert), B01 (entête
// déclaration), B02 (salariés du préétabli), B03 (récap B02), B04 (entrants),
// B05 (récap B04), B06 (récap global).

const SITUATION_NUM: Record<SituationCnss, number> = { '': 0, SO: 1, DE: 2, IT: 3, IL: 4, AT: 5, CS: 6, MS: 7, MP: 8 }

export const LIBELLES_SITUATION: Record<SituationCnss, string> = {
  '': 'Normale',
  SO: 'Sortant',
  DE: 'Décédé',
  IT: 'Maternité',
  IL: 'Maladie',
  AT: 'Accident de travail',
  CS: 'Congé sans solde',
  MS: 'Maintenu sans salaire',
  MP: 'Maladie professionnelle',
}

export interface LigneCnss {
  salarie: Salarie
  bulletin: Bulletin
  situation: SituationCnss
  entrant: boolean
  salaireReel: number
  salairePlafonne: number
  jours: number
}

export interface DeclarationCnss {
  periode: string
  lignes: LigneCnss[]
  anomalies: string[]
  cotisations: {
    prestationsSalarial: number
    prestationsPatronal: number
    allocationsFamiliales: number
    formationProfessionnelle: number
    amoSalarial: number
    amoPatronal: number
    participationAmo: number
    totalCnss: number
    totalAmo: number
    total: number
  }
}

export function preparerDeclarationCnss(db: BaseDonnees, p: PeriodePaie): DeclarationCnss {
  const anomalies: string[] = []
  const lignes: LigneCnss[] = []
  const debut = `${p.id}-01`
  if (!/^\d{7}$/.test(db.societe.cnssAffiliation)) anomalies.push('Numéro d\'affiliation CNSS de la société absent ou invalide (7 chiffres).')

  for (const b of Object.values(p.bulletins)) {
    const s = db.salaries.find((x) => x.id === b.salarieId)
    if (!s) continue
    const situation = p.variables[s.id]?.situationCnss || (s.dateSortie && s.dateSortie.startsWith(p.id) ? 'SO' : '')
    if (b.baseCnss <= 0 && !situation) continue
    if (!/^\d{9}$/.test(s.numeroCnss)) {
      anomalies.push(`${nomComplet(s)} : numéro d'immatriculation CNSS manquant ou invalide (9 chiffres) - salarié non déclaré.`)
      continue
    }
    lignes.push({
      salarie: s,
      bulletin: b,
      situation,
      entrant: s.dateEmbauche >= debut,
      salaireReel: b.baseCnss,
      salairePlafonne: b.baseCnssPlafonnee,
      jours: b.joursDeclaresCnss,
    })
  }
  lignes.sort((a, b) => a.salarie.numeroCnss.localeCompare(b.salarie.numeroCnss))

  const t = (f: (b: Bulletin) => number) => round2(lignes.reduce((a, l) => a + f(l.bulletin), 0))
  const c = {
    prestationsSalarial: t((b) => b.cnssSalarial),
    prestationsPatronal: t((b) => b.patronal.prestationsSociales),
    allocationsFamiliales: t((b) => b.patronal.allocationsFamiliales),
    formationProfessionnelle: t((b) => b.patronal.formationProfessionnelle),
    amoSalarial: t((b) => b.amoSalarial),
    amoPatronal: t((b) => b.patronal.amo),
    participationAmo: t((b) => b.patronal.amoParticipation),
    totalCnss: 0,
    totalAmo: 0,
    total: 0,
  }
  c.totalCnss = round2(c.prestationsSalarial + c.prestationsPatronal + c.allocationsFamiliales + c.formationProfessionnelle)
  c.totalAmo = round2(c.amoSalarial + c.amoPatronal + c.participationAmo)
  c.total = round2(c.totalCnss + c.totalAmo)
  return { periode: p.id, lignes, anomalies, cotisations: c }
}

const ctrLigne = (l: LigneCnss) =>
  Number(l.salarie.numeroCnss) + l.jours + centimes(l.salaireReel) + centimes(l.salairePlafonne) + SITUATION_NUM[l.situation]

export function genererFichierBds(db: BaseDonnees, d: DeclarationCnss, dateEmission = new Date()): string {
  const soc = db.societe
  const aff = num(soc.cnssAffiliation || '0', 7)
  const per = d.periode.replace('-', '')
  const [a, m] = d.periode.split('-').map(Number)
  const exig = new Date(Date.UTC(a, m, 10)).toISOString().slice(0, 10).replace(/-/g, '')
  const emis = dateEmission.toISOString().slice(0, 10).replace(/-/g, '')
  const rec: string[] = []

  rec.push('B00' + num(aff + per, 14) + 'B0' + ' '.repeat(241))
  rec.push(
    'B01' + aff + per + alpha(soc.raisonSociale, 40) + alpha(soc.activite, 40) + alpha(soc.adresse, 120) +
      alpha(soc.ville, 20) + num(soc.codePostal || '0', 6) + num(soc.cnssCodeAgence || '0', 2) + emis + exig,
  )

  const recap = (ls: LigneCnss[]) => ({
    nb: ls.length,
    imma: ls.reduce((s, l) => s + Number(l.salarie.numeroCnss), 0),
    jours: ls.reduce((s, l) => s + l.jours, 0),
    reel: ls.reduce((s, l) => s + centimes(l.salaireReel), 0),
    plaf: ls.reduce((s, l) => s + centimes(l.salairePlafonne), 0),
    ctr: ls.reduce((s, l) => s + ctrLigne(l), 0),
    enfants: ls.reduce((s, l) => s + Math.min(99, l.salarie.nombreEnfants), 0),
  })

  const preetabli = d.lignes.filter((l) => !l.entrant)
  for (const l of preetabli) {
    rec.push(
      'B02' + aff + per + num(l.salarie.numeroCnss, 9) + alpha(nomComplet(l.salarie), 60) +
        num(Math.min(99, l.salarie.nombreEnfants), 2) + num(0, 6) + num(0, 6) + num(0, 6) + num(0, 6) +
        num(l.jours, 2) + num(centimes(l.salaireReel), 13) + num(centimes(l.salairePlafonne), 9) +
        alpha(l.situation, 2) + num(ctrLigne(l), 19) + ' '.repeat(104),
    )
  }
  const r2 = recap(preetabli)
  rec.push(
    'B03' + aff + per + num(r2.nb, 6) + num(r2.enfants, 6) + num(0, 12) + num(0, 12) + num(0, 12) + num(r2.imma, 15) +
      num(0, 12) + num(r2.jours, 6) + num(r2.reel, 15) + num(r2.plaf, 13) + num(r2.ctr, 19) + ' '.repeat(116),
  )

  const entrants = d.lignes.filter((l) => l.entrant)
  for (const l of entrants) {
    rec.push(
      'B04' + aff + per + num(l.salarie.numeroCnss, 9) + alpha(nomComplet(l.salarie), 60) + alpha(l.salarie.cin, 8) +
        num(l.jours, 2) + num(centimes(l.salaireReel), 13) + num(centimes(l.salairePlafonne), 9) +
        num(ctrLigne(l), 19) + ' '.repeat(124),
    )
  }
  const r4 = recap(entrants)
  const recapLigne = (type: string, r: ReturnType<typeof recap>) =>
    type + aff + per + num(r.nb, 6) + num(r.imma, 15) + num(r.jours, 6) + num(r.reel, 15) + num(r.plaf, 13) + num(r.ctr, 19) + ' '.repeat(170)
  rec.push(recapLigne('B05', r4))
  rec.push(recapLigne('B06', recap(d.lignes)))

  for (const r of rec) if (r.length !== 260) throw new Error(`Enregistrement ${r.slice(0, 3)} de longueur ${r.length} (260 attendu)`)
  return rec.join('\r\n') + '\r\n'
}
