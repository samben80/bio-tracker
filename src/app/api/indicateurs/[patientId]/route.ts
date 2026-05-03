import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { cookies } from 'next/headers'
import { IndicateurEvolution } from '@/lib/types'

type PatientAccess = { user_id: number | null; session_token: string | null }

async function q<T>(promise: Promise<unknown>): Promise<T[]> {
  return promise as unknown as T[]
}

async function canAccessPatient(patientId: number): Promise<boolean> {
  const session = await getServerSession(authOptions)
  const sql = await getDb()
  const rows = await q<PatientAccess>(sql`SELECT user_id, session_token FROM patients WHERE id = ${patientId}`)
  const patient = rows[0]
  if (!patient) return false
  if (session?.user?.role === 'admin') return true
  if (session?.user?.id && patient.user_id === parseInt(session.user.id)) return true
  if (!patient.user_id && patient.session_token) {
    const cookieStore = await cookies()
    return cookieStore.get('bio_session')?.value === patient.session_token
  }
  return false
}

export async function GET(_req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params
  const pid = parseInt(patientId)

  if (!(await canAccessPatient(pid))) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const sql = await getDb()
  const rows = await q<{
    nom: string; categorie: string | null; valeur: number | null; valeur_texte: string | null
    unite: string | null; ref_min: number | null; ref_max: number | null; ref_texte: string | null
    date_analyse: string; analyse_id: number
  }>(sql`
    SELECT i.nom, i.categorie, i.valeur, i.valeur_texte, i.unite,
           i.ref_min, i.ref_max, i.ref_texte,
           a.date_analyse, a.id as analyse_id
    FROM indicateurs i
    JOIN analyses a ON a.id = i.analyse_id
    WHERE a.patient_id = ${pid}
    ORDER BY i.nom, a.date_analyse ASC
  `)

  const map = new Map<string, IndicateurEvolution>()
  for (const row of rows) {
    if (!map.has(row.nom)) {
      map.set(row.nom, { nom: row.nom, unite: row.unite, ref_min: row.ref_min, ref_max: row.ref_max, points: [] })
    }
    const evo = map.get(row.nom)!
    if (row.ref_min !== null) evo.ref_min = row.ref_min
    if (row.ref_max !== null) evo.ref_max = row.ref_max
    if (row.unite) evo.unite = row.unite
    evo.points.push({ date: row.date_analyse, valeur: row.valeur, valeur_texte: row.valeur_texte, analyse_id: row.analyse_id })
  }

  return NextResponse.json(Array.from(map.values()))
}
