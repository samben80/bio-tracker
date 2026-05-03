import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { cookies } from 'next/headers'

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
    const token = cookieStore.get('bio_session')?.value
    return token === patient.session_token
  }
  return false
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const patientId = parseInt(id)

  if (!(await canAccessPatient(patientId))) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const sql = await getDb()
  const patientRows = await q<Record<string, unknown>>(sql`SELECT * FROM patients WHERE id = ${patientId}`)
  const analyses = await sql`
    SELECT a.*, COUNT(i.id) as nb_indicateurs
    FROM analyses a
    LEFT JOIN indicateurs i ON i.analyse_id = a.id
    WHERE a.patient_id = ${patientId}
    GROUP BY a.id
    ORDER BY a.date_analyse DESC
  `

  return NextResponse.json({ patient: patientRows[0], analyses })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const patientId = parseInt(id)

  if (!(await canAccessPatient(patientId))) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const sql = await getDb()
  await sql`DELETE FROM patients WHERE id = ${patientId}`
  return NextResponse.json({ ok: true })
}
