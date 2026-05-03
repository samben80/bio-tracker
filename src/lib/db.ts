import { neon } from '@neondatabase/serverless'

export type Sql = ReturnType<typeof neon>

let _sql: Sql | null = null
let _initialized = false

export function getSql(): Sql {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquant')
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql
}

export async function getDb(): Promise<Sql> {
  const sql = getSql()
  if (!_initialized) {
    await initSchema(sql)
    _initialized = true
  }
  return sql
}

async function initSchema(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'user',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS patients (
      id             SERIAL PRIMARY KEY,
      user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
      session_token  TEXT,
      nom            TEXT NOT NULL,
      prenom         TEXT,
      date_naissance TEXT,
      dossier_ref    TEXT,
      telephone      TEXT,
      email          TEXT,
      relation       TEXT DEFAULT 'self',
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS analyses (
      id            SERIAL PRIMARY KEY,
      patient_id    INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      date_analyse  TEXT NOT NULL,
      laboratoire   TEXT,
      fichier_nom   TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS indicateurs (
      id            SERIAL PRIMARY KEY,
      analyse_id    INTEGER NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
      nom           TEXT NOT NULL,
      categorie     TEXT,
      valeur        REAL,
      valeur_texte  TEXT,
      unite         TEXT,
      ref_min       REAL,
      ref_max       REAL,
      ref_texte     TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_patients_user       ON patients(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_patients_session    ON patients(session_token)`
  await sql`CREATE INDEX IF NOT EXISTS idx_analyses_patient    ON analyses(patient_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_indicateurs_analyse ON indicateurs(analyse_id)`
}
