import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const db = getDb()
  const userId = parseInt(session.user.id)

  const patients = db.prepare(`
    SELECT p.*, COUNT(DISTINCT a.id) as nb_analyses, MAX(a.date_analyse) as derniere_analyse
    FROM patients p
    LEFT JOIN analyses a ON a.patient_id = p.id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.relation = 'self' DESC, p.nom
  `).all(userId)

  return NextResponse.json({ email: session.user.email, role: session.user.role, patients })
}
