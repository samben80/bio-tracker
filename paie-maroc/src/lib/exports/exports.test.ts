import { describe, expect, it } from 'vitest'
import { donneesDemo } from '../demo'
import { round2 } from '../paie/calcul'
import { ecrituresComptables, lignesCimr } from './autres'
import { genererFichierBds, preparerDeclarationCnss } from './cnss'
import { genererXml9421 } from './ir'

const db = donneesDemo()
const sept = db.periodes.find((p) => p.id === '2026-09')!

describe('déclaration CNSS (BDS)', () => {
  const d = preparerDeclarationCnss(db, sept)
  it('exclut le stagiaire exonéré et totalise les cotisations', () => {
    expect(d.lignes).toHaveLength(5)
    expect(d.cotisations.total).toBe(round2(d.cotisations.totalCnss + d.cotisations.totalAmo))
  })
  it('produit des enregistrements de 260 caractères', () => {
    const f = genererFichierBds(db, d, new Date('2026-10-05'))
    const recs = f.split('\r\n').filter(Boolean)
    expect(recs.map((r) => r.slice(0, 3))).toEqual(['B00', 'B01', 'B02', 'B02', 'B02', 'B02', 'B02', 'B03', 'B05', 'B06'])
    for (const r of recs) expect(r).toHaveLength(260)
    expect(recs[1].slice(3, 16)).toBe('1234567202609')
  })
})

describe('écriture comptable', () => {
  it('est équilibrée', () => {
    const e = ecrituresComptables(sept)
    const d = round2(e.reduce((a, x) => a + x.debit, 0))
    const c = round2(e.reduce((a, x) => a + x.credit, 0))
    expect(d).toBe(c)
  })
})

describe('états annuels', () => {
  it('génère le XML 9421 avec permanents et stagiaires', () => {
    const xml = genererXml9421(db, 2026)
    expect(xml).toContain('<nbrPersoPermanent>5</nbrPersoPermanent>')
    expect(xml).toContain('<nbrStagiaires>1</nbrStagiaires>')
    expect(xml.match(/<VersementTraitementSalaire>/g)).toHaveLength(3)
  })
  it('agrège la CIMR du trimestre', () => {
    const l = lignesCimr(db, 2026, 3)
    expect(l).toHaveLength(2)
    expect(l[0].detail.every((x) => x > 0)).toBe(true)
  })
})

describe('données de démonstration', () => {
  it('appliquent la prime d\'ancienneté depuis la date d\'embauche', () => {
    const b = sept.bulletins['sal-001'] // embauché en 2005 : 21 ans → 20 %
    expect(b.tauxAnciennete).toBe(20)
  })
})
