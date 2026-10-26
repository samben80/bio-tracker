import { bulletinsDe, periodesAnnee, totaliser } from '../paie/agregats'
import { round2 } from '../paie/calcul'
import { nomComplet } from '../paie/salarie'
import type { BaseDonnees, PeriodePaie } from '../paie/types'
import { csv, libellePeriode } from './format'

/** Bordereau trimestriel CIMR (déclaration des salaires et cotisations). */
export function lignesCimr(db: BaseDonnees, annee: number, trimestre: number) {
  const mois = [1, 2, 3].map((i) => (trimestre - 1) * 3 + i)
  const parSalarie = new Map<string, { salaire: number; salarial: number; patronal: number; detail: number[] }>()
  for (const p of periodesAnnee(db, annee).filter((p) => mois.includes(p.mois))) {
    for (const b of bulletinsDe(p)) {
      if (b.baseCimr <= 0) continue
      const l = parSalarie.get(b.salarieId) ?? { salaire: 0, salarial: 0, patronal: 0, detail: [0, 0, 0] }
      l.salaire = round2(l.salaire + b.baseCimr)
      l.salarial = round2(l.salarial + b.cimrSalarial)
      l.patronal = round2(l.patronal + b.patronal.cimr)
      l.detail[mois.indexOf(p.mois)] = b.baseCimr
      parSalarie.set(b.salarieId, l)
    }
  }
  return [...parSalarie.entries()].map(([id, l]) => ({ salarie: db.salaries.find((s) => s.id === id)!, ...l }))
}

export function csvCimr(db: BaseDonnees, annee: number, trimestre: number) {
  const lignes = lignesCimr(db, annee, trimestre)
  return csv([
    ['N° adhérent', db.societe.cimrAdherent, 'Trimestre', `T${trimestre} ${annee}`],
    ['Matricule CIMR', 'Nom', 'Prénom', 'CIN', 'N° CNSS', 'Taux salarial %', 'Salaire M1', 'Salaire M2', 'Salaire M3', 'Salaire trimestre', 'Cotisation salariale', 'Cotisation patronale', 'Total'],
    ...lignes.map((l) => [
      l.salarie.numeroCimr, l.salarie.nom.toUpperCase(), l.salarie.prenom, l.salarie.cin, l.salarie.numeroCnss,
      l.salarie.tauxCimr, ...l.detail, l.salaire, l.salarial, l.patronal, round2(l.salarial + l.patronal),
    ]),
  ])
}

/** Ordre de virement des salaires (format tableur, importable en banque). */
export function csvVirements(db: BaseDonnees, p: PeriodePaie) {
  const lignes = bulletinsDe(p)
    .map((b) => ({ b, s: db.salaries.find((s) => s.id === b.salarieId)! }))
    .filter(({ s, b }) => s.modePaiement === 'VIREMENT' && b.netAPayer > 0)
  return csv([
    ['Donneur d\'ordre', db.societe.raisonSociale, 'RIB', db.societe.rib, 'Motif', `SALAIRE ${libellePeriode(p.id).toUpperCase()}`],
    ['Matricule', 'Bénéficiaire', 'Banque', 'RIB (24 chiffres)', 'Montant'],
    ...lignes.map(({ s, b }) => [s.matricule, nomComplet(s), s.banque, s.rib, b.netAPayer]),
    ['', 'TOTAL', '', '', round2(lignes.reduce((a, l) => a + l.b.netAPayer, 0))],
  ])
}

export interface Ecriture {
  compte: string
  libelle: string
  debit: number
  credit: number
}

/** Écriture de paie centralisée selon le Code général de normalisation comptable (CGNC). */
export function ecrituresComptables(p: PeriodePaie): Ecriture[] {
  const t = totaliser(bulletinsDe(p))
  const bulletins = bulletinsDe(p)
  const avances = round2(bulletins.reduce((a, b) => a + (b.lignes.find((l) => l.code === '800')?.retenue ?? 0), 0))
  const prets = round2(bulletins.reduce((a, b) => a + (b.lignes.find((l) => l.code === '500')?.retenue ?? 0), 0))
  const autres = round2(t.retenuesNet - avances - prets)
  const cnssOrg = round2(t.cnssSalarial + t.amoSalarial + t.patronalPrestations + t.patronalAF + t.patronalTFP + t.patronalAMO + t.patronalParticipationAMO)
  const lib = `Paie ${libellePeriode(p.id)}`
  const e: Ecriture[] = [
    { compte: '6171', libelle: `Rémunérations du personnel - ${lib}`, debit: round2(t.brut + t.arrondi), credit: 0 },
    { compte: '6174', libelle: `Charges sociales patronales - ${lib}`, debit: t.patronalTotal, credit: 0 },
    { compte: '4441', libelle: 'CNSS (prestations, AF, TFP, AMO)', debit: 0, credit: cnssOrg },
    { compte: '4443', libelle: 'CIMR - caisse de retraite', debit: 0, credit: round2(t.cimrSalarial + t.patronalCimr) },
    { compte: '4445', libelle: 'Mutuelles', debit: 0, credit: round2(t.mutuelleSalarial + t.patronalMutuelle) },
    { compte: '4452', libelle: 'État - IR retenu à la source', debit: 0, credit: t.ir },
    { compte: '3431', libelle: 'Avances et prêts au personnel', debit: 0, credit: round2(avances + prets) },
    { compte: '4488', libelle: 'Oppositions et retenues diverses', debit: 0, credit: autres },
    { compte: '7197', libelle: 'Transfert de charges - avantages en nature', debit: 0, credit: t.avantagesNature },
    { compte: '4432', libelle: 'Rémunérations dues au personnel', debit: 0, credit: t.netAPayer },
  ]
  return e.filter((x) => x.debit || x.credit)
}

export function csvComptable(p: PeriodePaie) {
  const [a, m] = p.id.split('-').map(Number)
  const date = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10)
  return csv([
    ['Journal', 'Date', 'Compte', 'Libellé', 'Débit', 'Crédit'],
    ...ecrituresComptables(p).map((e) => ['PAIE', date, e.compte, e.libelle, e.debit, e.credit]),
  ])
}

export function csvJournal(db: BaseDonnees, p: PeriodePaie) {
  return csv([
    ['Matricule', 'Nom', 'Salaire base', 'Brut', 'Brut imposable', 'Base CNSS', 'CNSS', 'AMO', 'CIMR', 'Mutuelle', 'Frais pro', 'Net imposable', 'IR', 'Retenues', 'Net à payer', 'Charges patronales', 'Coût employeur'],
    ...bulletinsDe(p).map((b) => {
      const s = db.salaries.find((x) => x.id === b.salarieId)!
      return [s.matricule, nomComplet(s), b.salaireBase, b.brut, b.brutImposable, b.baseCnss, b.cnssSalarial, b.amoSalarial, b.cimrSalarial, b.mutuelleSalarial, b.fraisProfessionnels, b.netImposable, b.ir, b.retenuesNet + b.avantagesNature, b.netAPayer, b.patronal.total, b.coutEmployeur]
    }),
  ])
}
