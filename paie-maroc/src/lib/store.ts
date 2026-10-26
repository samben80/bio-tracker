import 'server-only'
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { neon } from '@neondatabase/serverless'
import { connection } from 'next/server'
import { PARAMETRES_DEFAUT, RUBRIQUES_DEFAUT, SOCIETE_VIDE } from './paie/defaults'
import { donneesDemo } from './demo'
import type { BaseDonnees } from './paie/types'

// Deux moteurs de stockage, un document JSON par dossier de paie :
// - Postgres (Neon) si DATABASE_URL est défini : hébergement Vercel ;
// - fichier local sinon : poste de développement ou serveur unique.

const VERSION = 1

export function dossierVierge(): BaseDonnees {
  return {
    version: VERSION,
    societe: structuredClone(SOCIETE_VIDE),
    parametres: structuredClone(PARAMETRES_DEFAUT),
    rubriques: structuredClone(RUBRIQUES_DEFAUT),
    salaries: [],
    periodes: [],
  }
}

/** Données créées au premier lancement : vierges en production, démonstration ailleurs. */
function donneesInitiales(): BaseDonnees {
  const choix = process.env.PAIE_DONNEES_INITIALES ?? (process.env.VERCEL_ENV === 'production' ? 'vide' : 'demo')
  return choix === 'vide' ? dossierVierge() : donneesDemo()
}

/** Met à niveau un dossier enregistré par une version antérieure du logiciel. */
function migrer(db: BaseDonnees): BaseDonnees {
  db.parametres = { ...PARAMETRES_DEFAUT, ...db.parametres }
  db.rubriques ??= structuredClone(RUBRIQUES_DEFAUT)
  db.version = VERSION
  return db
}

interface Moteur {
  lire(): Promise<BaseDonnees>
  modifier<T>(fn: (db: BaseDonnees) => T | Promise<T>): Promise<T>
}

// ───────────── Fichier local ─────────────

function moteurFichier(fichier: string): Moteur {
  let verrou: Promise<unknown> = Promise.resolve()
  let initialisation: Promise<void> | null = null

  const ecrire = async (db: BaseDonnees) => {
    await fs.mkdir(path.dirname(fichier), { recursive: true })
    const tmp = `${fichier}.${randomUUID()}.tmp`
    await fs.writeFile(tmp, JSON.stringify(db, null, 2))
    await fs.rename(tmp, fichier)
  }
  const lire = async () => {
    initialisation ??= fs.access(fichier).catch(() => ecrire(donneesInitiales()))
    await initialisation
    return migrer(JSON.parse(await fs.readFile(fichier, 'utf8')) as BaseDonnees)
  }

  return {
    async lire() {
      await verrou
      return lire()
    },
    modifier(fn) {
      const run = verrou.then(async () => {
        const db = await lire()
        const res = await fn(db)
        await ecrire(db)
        return res
      })
      verrou = run.catch(() => undefined)
      return run
    },
  }
}

// ───────────── Postgres (Neon) ─────────────

function moteurPostgres(url: string): Moteur {
  const sql = neon(url)
  const ID = process.env.PAIE_DOSSIER ?? 'principal'
  let initialisation: Promise<unknown> | null = null

  const initialiser = () =>
    (initialisation ??= (async () => {
      await sql`CREATE TABLE IF NOT EXISTS paie_dossier (
        id TEXT PRIMARY KEY,
        revision INTEGER NOT NULL,
        donnees JSONB NOT NULL,
        maj_le TIMESTAMPTZ NOT NULL DEFAULT now()
      )`
      await sql`INSERT INTO paie_dossier (id, revision, donnees) VALUES (${ID}, 1, ${JSON.stringify(donneesInitiales())}::jsonb)
        ON CONFLICT (id) DO NOTHING`
    })().catch((e) => {
      initialisation = null
      throw e
    }))

  const lire = async () => {
    await initialiser()
    const [ligne] = (await sql`SELECT revision, donnees FROM paie_dossier WHERE id = ${ID}`) as { revision: number; donnees: BaseDonnees }[]
    return { revision: ligne.revision, db: migrer(ligne.donnees) }
  }

  return {
    async lire() {
      return (await lire()).db
    },
    // Verrou optimiste : l'écriture n'aboutit que si personne n'a modifié le dossier entre-temps.
    async modifier(fn) {
      for (let essai = 0; essai < 5; essai++) {
        const { revision, db } = await lire()
        const res = await fn(db)
        const maj = await sql`UPDATE paie_dossier SET donnees = ${JSON.stringify(db)}::jsonb, revision = revision + 1, maj_le = now()
          WHERE id = ${ID} AND revision = ${revision} RETURNING revision`
        if (maj.length) return res
      }
      throw new Error('Le dossier est modifié simultanément par un autre utilisateur : réessayez.')
    },
  }
}

let moteur: Moteur | null = null
const obtenirMoteur = () =>
  (moteur ??= process.env.DATABASE_URL
    ? moteurPostgres(process.env.DATABASE_URL)
    : moteurFichier(process.env.PAIE_DATA_FILE ?? path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'paie.json')))

export const typeStockage = () => (process.env.DATABASE_URL ? 'Postgres' : 'Fichier local')

export async function lireBase(): Promise<BaseDonnees> {
  await connection()
  return obtenirMoteur().lire()
}

/** Applique une modification au dossier et l'enregistre. */
export function modifierBase<T>(fn: (db: BaseDonnees) => T | Promise<T>): Promise<T> {
  return obtenirMoteur().modifier(fn)
}

export async function remplacerBase(db: BaseDonnees) {
  await modifierBase((actuelle) => {
    Object.assign(actuelle, migrer(db))
  })
}
