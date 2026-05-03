import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { email, password, nom, prenom, session_token } = await req.json()

    if (!email || !password || !nom) {
      return NextResponse.json({ error: 'email, password et nom sont requis' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Mot de passe trop court (8 caractères minimum)' }, { status: 400 })
    }

    const db = getDb()
    const normalizedEmail = email.toLowerCase().trim()

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail)
    if (existing) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 })
    }

    const hash = await bcrypt.hash(password, 12)
    const userResult = db.prepare(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)'
    ).run(normalizedEmail, hash, normalizedEmail === process.env.ADMIN_EMAIL ? 'admin' : 'user')

    const userId = userResult.lastInsertRowid as number

    // Migrate anonymous analyses from session to this account
    if (session_token) {
      // Find existing patient with this session_token
      const anonPatient = db.prepare(
        'SELECT id FROM patients WHERE session_token = ? AND user_id IS NULL'
      ).get(session_token) as { id: number } | undefined

      if (anonPatient) {
        // Update patient: link to user, set nom/prenom from registration
        db.prepare(
          'UPDATE patients SET user_id = ?, nom = ?, prenom = ?, session_token = NULL WHERE id = ?'
        ).run(userId, nom.toUpperCase().trim(), prenom?.trim() ?? null, anonPatient.id)
      } else {
        // Create a new patient profile for this user
        db.prepare(
          'INSERT INTO patients (user_id, nom, prenom, relation) VALUES (?, ?, ?, ?)'
        ).run(userId, nom.toUpperCase().trim(), prenom?.trim() ?? null, 'self')
      }
    } else {
      // No session — just create a profile
      db.prepare(
        'INSERT INTO patients (user_id, nom, prenom, relation) VALUES (?, ?, ?, ?)'
      ).run(userId, nom.toUpperCase().trim(), prenom?.trim() ?? null, 'self')
    }

    return NextResponse.json({ ok: true, email: normalizedEmail }, { status: 201 })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
