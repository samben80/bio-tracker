import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { cookies } from 'next/headers'

async function canAccessPatient(patientId: number): Promise<boolean> {
  const session = await getServerSession(authOptions)
  const db = getDb()

  const patient = db.prepare('SELECT user_id, session_token FROM patients WHERE id = ?')
    .get(patientId) as { user_id: number | null; session_token: string | null } | undefined

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

  const db = getDb()
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId)
  const analyses = db.prepare(`
    SELECT a.*, COUNT(i.id) as nb_indicateurs
    FROM analyses a
    LEFT JOIN indicateurs i ON i.analyse_id = a.id
    WHERE a.patient_id = ?
    GROUP BY a.id
    ORDER BY a.date_analyse DESC
  `).all(patientId)

  return NextResponse.json({ patient, analyses })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const patientId = parseInt(id)

  if (!(await canAccessPatient(patientId))) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  getDb().prepare('DELETE FROM patients WHERE id = ?').run(patientId)
  return NextResponse.json({ ok: true })
}
