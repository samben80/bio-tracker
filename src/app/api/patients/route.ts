import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { cookies } from 'next/headers'

export async function GET() {
  const session = await getServerSession(authOptions)
  const db = getDb()

  if (session?.user?.role === 'admin') {
    const patients = db.prepare(`
      SELECT p.*, COUNT(DISTINCT a.id) as nb_analyses, MAX(a.date_analyse) as derniere_analyse,
             u.email as user_email
      FROM patients p
      LEFT JOIN analyses a ON a.patient_id = p.id
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.user_id IS NOT NULL
      GROUP BY p.id
      ORDER BY p.nom, p.prenom
    `).all()
    return NextResponse.json(patients)
  }

  if (session?.user?.id) {
    const patients = db.prepare(`
      SELECT p.*, COUNT(DISTINCT a.id) as nb_analyses, MAX(a.date_analyse) as derniere_analyse
      FROM patients p
      LEFT JOIN analyses a ON a.patient_id = p.id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.nom, p.prenom
    `).all(parseInt(session.user.id))
    return NextResponse.json(patients)
  }

  // Anonymous — look up by session cookie
  const cookieStore = await cookies()
  const token = cookieStore.get('bio_session')?.value
  if (token) {
    const patients = db.prepare(`
      SELECT p.*, COUNT(DISTINCT a.id) as nb_analyses, MAX(a.date_analyse) as derniere_analyse
      FROM patients p
      LEFT JOIN analyses a ON a.patient_id = p.id
      WHERE p.session_token = ? AND p.user_id IS NULL
      GROUP BY p.id
      ORDER BY p.nom, p.prenom
    `).all(token)
    return NextResponse.json(patients)
  }

  return NextResponse.json([])
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const db = getDb()
  const body = await req.json()
  const { nom, prenom, date_naissance, relation } = body

  if (!nom) return NextResponse.json({ error: 'nom requis' }, { status: 400 })

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentification requise pour ajouter un membre' }, { status: 401 })
  }

  const result = db.prepare(`
    INSERT INTO patients (user_id, nom, prenom, date_naissance, relation)
    VALUES (?, ?, ?, ?, ?)
  `).run(parseInt(session.user.id), nom.toUpperCase().trim(), prenom ?? null, date_naissance ?? null, relation ?? 'self')

  return NextResponse.json(db.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid), { status: 201 })
}
