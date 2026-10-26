import { beforeEach, describe, expect, it } from 'vitest'
import { creerJeton, roleDuMotDePasse, verifierJeton } from './session'

describe('session', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'x'.repeat(40)
    process.env.PAIE_MOT_DE_PASSE = 'util'
    process.env.PAIE_MOT_DE_PASSE_ADMIN = 'admin'
  })

  it('reconnaît les mots de passe', () => {
    expect(roleDuMotDePasse('admin')).toBe('admin')
    expect(roleDuMotDePasse('util')).toBe('utilisateur')
    expect(roleDuMotDePasse('autre')).toBeNull()
  })

  it('valide un jeton signé et rejette un jeton falsifié', async () => {
    const j = await creerJeton('utilisateur')
    expect((await verifierJeton(j))?.role).toBe('utilisateur')
    const [charge, sig] = j.split('.')
    const falsifie = Buffer.from(JSON.stringify({ role: 'admin', exp: 9e9 })).toString('base64url')
    expect(await verifierJeton(`${falsifie}.${sig}`)).toBeNull()
    expect(await verifierJeton(`${charge}.abc`)).toBeNull()
    expect(await verifierJeton(undefined)).toBeNull()
  })

  it('refuse l\'accès sur Vercel si aucun mot de passe n\'est configuré', async () => {
    delete process.env.PAIE_MOT_DE_PASSE
    delete process.env.PAIE_MOT_DE_PASSE_ADMIN
    process.env.VERCEL = '1'
    expect(await verifierJeton(undefined)).toBeNull()
    delete process.env.VERCEL
    expect((await verifierJeton(undefined))?.role).toBe('admin') // développement local
  })
})
