import { describe, expect, it } from 'vitest'
import {
  anneesRevolues,
  calculerBulletin,
  indemniteLicenciement,
  irBrutMensuel,
  salaireBasePourNet,
  variablesParDefaut,
} from './calcul'
import { PARAMETRES_DEFAUT as P, RUBRIQUES_DEFAUT as R } from './defaults'
import { nouveauSalarie } from './salarie'
import type { Salarie } from './types'

const salarie = (o: Partial<Salarie>): Salarie => ({ ...nouveauSalarie(), id: 't', ...o })

describe('barème IR (LF 2025)', () => {
  it('exonère jusqu\'à 40 000 DH annuels', () => {
    expect(irBrutMensuel(40000 / 12, P)).toBe(0)
  })
  it('est continu aux bornes des tranches', () => {
    for (const borne of [60000, 80000, 100000, 180000]) {
      const avant = irBrutMensuel((borne - 0.01) / 12, P)
      const apres = irBrutMensuel((borne + 0.01) / 12, P)
      expect(Math.abs(apres - avant)).toBeLessThan(0.01)
    }
  })
  it('applique 37 % - 27 400 au-delà de 180 000', () => {
    expect(irBrutMensuel(20000, P)).toBeCloseTo((240000 * 0.37 - 27400) / 12, 2)
  })
})

describe('ancienneté', () => {
  it('compte les années révolues', () => {
    expect(anneesRevolues('2020-11-01', new Date(Date.UTC(2026, 9, 31)))).toBe(5)
    expect(anneesRevolues('2020-10-31', new Date(Date.UTC(2026, 9, 31)))).toBe(6)
  })
})

describe('bulletin de paie', () => {
  it('calcule un cadre marié, 2 enfants, 3 ans d\'ancienneté à 10 000 DH', () => {
    const s = salarie({ salaireBase: 10000, situationFamiliale: 'M', nombreEnfants: 2, personnesACharge: 3, dateEmbauche: '2023-06-01', dateAnciennete: '2023-06-01' })
    const b = calculerBulletin(s, variablesParDefaut(s, P), '2026-10', P, R)
    expect(b.tauxAnciennete).toBe(5)
    expect(b.brut).toBe(10500)
    expect(b.cnssSalarial).toBe(268.8)
    expect(b.amoSalarial).toBe(237.3)
    expect(b.fraisProfessionnels).toBe(2625)
    expect(b.netImposable).toBe(7368.9)
    expect(b.ir).toBeCloseTo(585.67, 2)
    expect(b.netAPayer).toBeCloseTo(9408.23, 2)
    // charges patronales : 6000*8.98% + 10500*(6.4+1.6+2.26+1.85)%
    expect(b.patronal.total).toBeCloseTo(538.8 + 10500 * 0.1211, 1)
  })

  it('applique les frais professionnels à 35 % sous le seuil de 78 000 DH', () => {
    const s = salarie({ salaireBase: 5000, dateEmbauche: '2026-01-01', dateAnciennete: '2026-01-01' })
    const b = calculerBulletin(s, variablesParDefaut(s, P), '2026-10', P, R)
    expect(b.fraisProfessionnels).toBe(1750)
    expect(b.ir).toBe(0)
    expect(b.netAPayer).toBe(4663)
  })

  it('plafonne les frais professionnels à 35 000 DH/an', () => {
    const s = salarie({ salaireBase: 30000, dateEmbauche: '2026-01-01', dateAnciennete: '2026-01-01' })
    const b = calculerBulletin(s, variablesParDefaut(s, P), '2026-10', P, R)
    expect(b.fraisProfessionnels).toBeCloseTo(2916.67, 2)
    expect(b.ir).toBeCloseTo(((30000 - 2916.67 - 946.8) * 12 * 0.37 - 27400) / 12, 1)
  })

  it('exonère les indemnités dans la limite des plafonds', () => {
    const s = salarie({ salaireBase: 8000, dateEmbauche: '2026-01-01', dateAnciennete: '2026-01-01', elementsFixes: [{ code: '300', montant: 700 }] })
    const b = calculerBulletin(s, variablesParDefaut(s, P), '2026-10', P, R)
    expect(b.brut).toBe(8700)
    expect(b.brutImposable).toBe(8200) // 500 exonérés
    expect(b.baseCnss).toBe(8200)
  })

  it('déduit les absences, ajoute les heures sup et la CIMR', () => {
    const s = salarie({ salaireBase: 9550, horaireMensuel: 191, affilieCimr: true, tauxCimr: 6, dateEmbauche: '2026-01-01', dateAnciennete: '2026-01-01' })
    const v = { ...variablesParDefaut(s, P), joursAbsenceNonPayee: 2, hs25: 10 }
    const b = calculerBulletin(s, v, '2026-10', P, R)
    const absence = (9550 / 26) * 2
    const hs = 50 * 1.25 * 10
    expect(b.brut).toBeCloseTo(9550 - absence + hs, 1)
    expect(b.cimrSalarial).toBeCloseTo(b.brut * 0.06, 1)
    expect(b.patronal.cimr).toBeCloseTo(b.brut * 0.078, 1)
    expect(b.joursDeclaresCnss).toBe(24)
  })

  it('déduit les avantages en nature du net et de la base des frais pro', () => {
    const s = salarie({ salaireBase: 7000, dateEmbauche: '2026-01-01', dateAnciennete: '2026-01-01', elementsFixes: [{ code: '400', montant: 1000 }] })
    const b = calculerBulletin(s, variablesParDefaut(s, P), '2026-10', P, R)
    expect(b.brutImposable).toBe(8000)
    expect(b.fraisProfessionnels).toBe(7000 * 0.25)
    expect(b.netAPayer).toBeCloseTo(8000 - 1000 - b.totalCotisationsSalariales - b.ir, 2)
  })

  it('retrouve le brut à partir du net (simulateur)', () => {
    const s = salarie({ dateEmbauche: '2026-01-01', dateAnciennete: '2026-01-01', personnesACharge: 1 })
    const base = salaireBasePourNet(12000, s, P, R, '2026-10')
    const b = calculerBulletin({ ...s, salaireBase: base }, variablesParDefaut(s, P), '2026-10', P, R)
    expect(b.netAPayer).toBeCloseTo(12000, 1)
  })
})

describe('indemnité de licenciement', () => {
  it('cumule 96 h puis 144 h par année', () => {
    const r = indemniteLicenciement(7, 6000, 191)
    expect(r.heures).toBe(5 * 96 + 2 * 144)
    expect(r.montant).toBeCloseTo(768 * (6000 / 191), 0)
  })
})

describe('solde de tout compte', () => {
  it('calcule congés, préavis et indemnité légale de licenciement', async () => {
    const { calculerSoldeToutCompte } = await import('./stc')
    const { donneesDemo } = await import('../demo')
    const db = donneesDemo()
    const s = db.salaries.find((x) => x.id === 'sal-003')! // embauché le 07/01/2019
    const r = calculerSoldeToutCompte(db, s, { dateSortie: '2026-10-31', motif: 'LICENCIEMENT', moisPreavis: 1, joursCongesRestants: 10, abusif: false })
    expect(r.anciennete).toBeCloseTo(7.8, 1)
    expect(r.licenciement.heures).toBeCloseTo(5 * 96 + (r.anciennete - 5) * 144, -1)
    expect(r.conges).toBeCloseTo((10 * r.salaireMoyen) / 26, 1)
    expect(r.elements.map((e) => e.code)).toEqual(['206', '207', '311'])
    const dem = calculerSoldeToutCompte(db, s, { dateSortie: '2026-10-31', motif: 'DEMISSION', moisPreavis: 0, joursCongesRestants: 10, abusif: false })
    expect(dem.licenciement.montant).toBe(0)
  })
})

describe('prorata d\'entrée et de sortie', () => {
  it('proratise les jours payés sur le mois d\'embauche et de sortie', async () => {
    const { joursPayesParDefaut } = await import('./calcul')
    expect(joursPayesParDefaut(salarie({ dateEmbauche: '2026-11-16' }), P, '2026-11')).toBe(13)
    expect(joursPayesParDefaut(salarie({ dateEmbauche: '2020-01-01', dateSortie: '2026-11-20' }), P, '2026-11')).toBe(17)
    expect(joursPayesParDefaut(salarie({ dateEmbauche: '2020-01-01' }), P, '2026-11')).toBe(26)
  })
})
