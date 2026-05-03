import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { cookies } from 'next/headers'

export async function GET() {
  const session = await getServerSession(authOptions)
  const sql = await getDb()

  if (session?.user?.role === 'admin') {
    const patients = await sql`
      SELECT p.*, COUNT(DISTINCT a.id) as nb_analyses, MAX(a.date_analyse) as derniere_analyse,
             u.email as user_email
      FROM patients p
      LEFT JOIN analyses a ON a.patient_id = p.id
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.user_id IS NOT NULL
      GROUP BY p.id, u.email
      ORDER BY p.nom, p.prenom
    `
    return NextResponse.json(patients)
  }

  if (session?.user?.id) {
    const patients = await sql`
      SELECT p.*, COUNT(DISTINCT a.id) as nb_analyses, MAX(a.date_analyse) as derniere_analyse
      FROM patients p
      LEFT JOIN analyses a ON a.patient_id = p.id
      WHERE p.user_id = ${parseInt(session.user.id)}
      GROUP BY p.id
      ORDER BY p.nom, p.prenom
    `
    return NextResponse.json(patients)
  }

  const cookieStore = await cookies()
  const token = cookieStore.get('bio_session')?.value
  if (token) {
    const patients = await sql`
      SELECT p.*, COUNT(DISTINCT a.id) as nb_analyses, MAX(a.date_analyse) as derniere_analyse
      FROM patients p
      LEFT JOIN analyses a ON a.patient_id = p.id
      WHERE p.session_token = ${token} AND p.user_id IS NULL
      GROUP BY p.id
      ORDER BY p.nom, p.prenom
    `
    return NextResponse.json(patients)
  }

  return NextResponse.json([])
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const sql = await getDb()
  const body = await req.json()
  const { nom, prenom, date_naissance, relation } = body

  if (!nom) return NextResponse.json({ error: 'nom requis' }, { status: 400 })

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentification requise pour ajouter un membre' }, { status: 401 })
  }

  const result = (await sql`
    INSERT INTO patients (user_id, nom, prenom, date_naissance, relation)
    VALUES (${parseInt(session.user.id)}, ${nom.toUpperCase().trim()}, ${prenom ?? null}, ${date_naissance ?? null}, ${relation ?? 'self'})
    RETURNING *
  `) as unknown as Record<string, unknown>[]

  return NextResponse.json(result[0], { status: 201 })
}
