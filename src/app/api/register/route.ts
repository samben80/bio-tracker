import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'

type IdRow = { id: number }

async function q<T>(promise: Promise<unknown>): Promise<T[]> {
  return promise as unknown as T[]
}

export async function POST(req: Request) {
  try {
    const { email, password, nom, prenom, session_token } = await req.json()

    if (!email || !password || !nom) {
      return NextResponse.json({ error: 'email, password et nom sont requis' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Mot de passe trop court (8 caractères minimum)' }, { status: 400 })
    }

    const sql = await getDb()
    const normalizedEmail = email.toLowerCase().trim()

    const existing = await q<IdRow>(sql`SELECT id FROM users WHERE email = ${normalizedEmail}`)
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 })
    }

    const hash = await bcrypt.hash(password, 12)
    const userResult = await q<IdRow>(sql`
      INSERT INTO users (email, password_hash, role)
      VALUES (${normalizedEmail}, ${hash}, ${normalizedEmail === process.env.ADMIN_EMAIL ? 'admin' : 'user'})
      RETURNING id
    `)
    const userId = userResult[0].id

    if (session_token) {
      const anonRows = await q<IdRow>(sql`
        SELECT id FROM patients WHERE session_token = ${session_token} AND user_id IS NULL
      `)
      if (anonRows.length > 0) {
        await sql`
          UPDATE patients
          SET user_id = ${userId}, nom = ${nom.toUpperCase().trim()}, prenom = ${prenom?.trim() ?? null}, session_token = NULL
          WHERE id = ${anonRows[0].id}
        `
      } else {
        await sql`
          INSERT INTO patients (user_id, nom, prenom, relation)
          VALUES (${userId}, ${nom.toUpperCase().trim()}, ${prenom?.trim() ?? null}, 'self')
        `
      }
    } else {
      await sql`
        INSERT INTO patients (user_id, nom, prenom, relation)
        VALUES (${userId}, ${nom.toUpperCase().trim()}, ${prenom?.trim() ?? null}, 'self')
      `
    }

    return NextResponse.json({ ok: true, email: normalizedEmail }, { status: 201 })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
