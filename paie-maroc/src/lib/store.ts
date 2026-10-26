import 'server-only'
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { connection } from 'next/server'
import { PARAMETRES_DEFAUT, RUBRIQUES_DEFAUT } from './paie/defaults'
import { donneesDemo } from './demo'
import type { BaseDonnees } from './paie/types'

// Stockage JSON local (un fichier par dossier de paie). Les écritures sont
// atomiques (fichier temporaire + rename) et sérialisées dans le processus.
const FICHIER = process.env.PAIE_DATA_FILE ?? path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'paie.json')
const VERSION = 1

let verrou: Promise<unknown> = Promise.resolve()

let initialisation: Promise<void> | null = null

/** Crée le dossier de démonstration au premier lancement (une seule fois par processus). */
function assurerFichier() {
  initialisation ??= fs.access(FICHIER).catch(() => ecrireFichier(donneesDemo()))
  return initialisation
}

async function lireFichier(): Promise<BaseDonnees> {
  await assurerFichier()
  const db = JSON.parse(await fs.readFile(FICHIER, 'utf8')) as BaseDonnees
  // complète les paramètres ajoutés dans les versions ultérieures
  db.parametres = { ...PARAMETRES_DEFAUT, ...db.parametres }
  db.rubriques ??= RUBRIQUES_DEFAUT
  return db
}

async function ecrireFichier(db: BaseDonnees) {
  await fs.mkdir(path.dirname(FICHIER), { recursive: true })
  const tmp = `${FICHIER}.${randomUUID()}.tmp`
  await fs.writeFile(tmp, JSON.stringify({ ...db, version: VERSION }, null, 2))
  await fs.rename(tmp, FICHIER)
}

export async function lireBase(): Promise<BaseDonnees> {
  await connection()
  await verrou
  return lireFichier()
}

/** Applique une modification à la base sous verrou et l'enregistre. */
export async function modifierBase<T>(fn: (db: BaseDonnees) => T | Promise<T>): Promise<T> {
  const run = verrou.then(async () => {
    const db = await lireFichier()
    const res = await fn(db)
    await ecrireFichier(db)
    return res
  })
  verrou = run.catch(() => undefined)
  return run
}

export async function remplacerBase(db: BaseDonnees) {
  await modifierBase((actuelle) => {
    Object.assign(actuelle, db)
  })
}
