import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'biotracker.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initSchema(db)
  return db
}

function getColumns(db: Database.Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(c => c.name)
}

function tableExists(db: Database.Database, table: string): boolean {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table)
  return !!row
}

function initSchema(db: Database.Database) {
  // Create base tables if they don't exist yet
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'user',
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id    INTEGER NOT NULL,
      date_analyse  TEXT NOT NULL,
      laboratoire   TEXT,
      fichier_nom   TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS indicateurs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      analyse_id    INTEGER NOT NULL,
      nom           TEXT NOT NULL,
      categorie     TEXT,
      valeur        REAL,
      valeur_texte  TEXT,
      unite         TEXT,
      ref_min       REAL,
      ref_max       REAL,
      ref_texte     TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );
  `)

  // Create or migrate patients table
  if (!tableExists(db, 'patients')) {
    db.exec(`
      CREATE TABLE patients (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
        session_token  TEXT,
        nom            TEXT NOT NULL,
        prenom         TEXT,
        date_naissance TEXT,
        dossier_ref    TEXT,
        telephone      TEXT,
        email          TEXT,
        relation       TEXT DEFAULT 'self',
        created_at     TEXT DEFAULT (datetime('now'))
      );
    `)
  } else {
    // Migrate existing patients table
    const cols = getColumns(db, 'patients')
    if (!cols.includes('user_id'))       db.exec("ALTER TABLE patients ADD COLUMN user_id INTEGER")
    if (!cols.includes('session_token')) db.exec("ALTER TABLE patients ADD COLUMN session_token TEXT")
    if (!cols.includes('relation'))      db.exec("ALTER TABLE patients ADD COLUMN relation TEXT DEFAULT 'self'")
  }

  // Now safe to create indexes (columns exist)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_patients_user      ON patients(user_id);
    CREATE INDEX IF NOT EXISTS idx_patients_session   ON patients(session_token);
    CREATE INDEX IF NOT EXISTS idx_analyses_patient   ON analyses(patient_id);
    CREATE INDEX IF NOT EXISTS idx_indicateurs_analyse ON indicateurs(analyse_id);
  `)
}
