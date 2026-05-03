import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { parsePdf } from '@/lib/pdf-parser'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const patientIdRaw = formData.get('patient_id') as string | null

    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await parsePdf(buffer)

    const session = await getServerSession(authOptions)
    const db = getDb()
    const cookieStore = await cookies()

    let sessionToken = cookieStore.get('bio_session')?.value
    if (!sessionToken && !session?.user?.id) {
      sessionToken = uuidv4()
    }

    let patientId: number

    if (patientIdRaw) {
      // Explicit patient chosen by user
      patientId = parseInt(patientIdRaw)
    } else if (session?.user?.id) {
      // Authenticated user — try to match by name in their patients
      const userId = parseInt(session.user.id)
      const parsedNom = (parsed.patient_nom || '').toUpperCase().trim()
      const parsedPrenom = (parsed.patient_prenom || '').trim()

      const existing = db.prepare(
        'SELECT id FROM patients WHERE user_id = ? AND nom = ? AND (prenom = ? OR prenom IS NULL)'
      ).get(userId, parsedNom, parsedPrenom) as { id: number } | undefined

      if (existing) {
        patientId = existing.id
      } else {
        const r = db.prepare(`
          INSERT INTO patients (user_id, nom, prenom, date_naissance, dossier_ref, telephone, email, relation)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(userId, parsedNom || 'Patient', parsed.patient_prenom ?? null,
          parsed.patient_date_naissance ?? null, parsed.dossier_ref ?? null,
          parsed.telephone ?? null, parsed.email ?? null, 'self')
        patientId = r.lastInsertRowid as number
      }
    } else {
      // Anonymous — use session token
      const existing = db.prepare(
        'SELECT id FROM patients WHERE session_token = ? AND user_id IS NULL'
      ).get(sessionToken!) as { id: number } | undefined

      if (existing) {
        patientId = existing.id
      } else {
        const parsedNom = (parsed.patient_nom || '').toUpperCase().trim()
        const r = db.prepare(`
          INSERT INTO patients (session_token, nom, prenom, date_naissance, dossier_ref, telephone, email)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(sessionToken, parsedNom || 'Patient anonyme', parsed.patient_prenom ?? null,
          parsed.patient_date_naissance ?? null, parsed.dossier_ref ?? null,
          parsed.telephone ?? null, parsed.email ?? null)
        patientId = r.lastInsertRowid as number
      }
    }

    const dateToUse = parsed.date_analyse ?? new Date().toISOString().slice(0, 10)
    const existingAnalyse = db.prepare(
      'SELECT id FROM analyses WHERE patient_id = ? AND date_analyse = ?'
    ).get(patientId, dateToUse) as { id: number } | undefined

    let analyseId: number
    if (existingAnalyse) {
      analyseId = existingAnalyse.id
      db.prepare('DELETE FROM indicateurs WHERE analyse_id = ?').run(analyseId)
    } else {
      const r = db.prepare(`
        INSERT INTO analyses (patient_id, date_analyse, laboratoire, fichier_nom)
        VALUES (?, ?, ?, ?)
      `).run(patientId, dateToUse, parsed.laboratoire ?? null, file.name)
      analyseId = r.lastInsertRowid as number
    }

    const insertInd = db.prepare(`
      INSERT INTO indicateurs (analyse_id, nom, categorie, valeur, valeur_texte, unite, ref_min, ref_max, ref_texte)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    db.transaction((inds: typeof parsed.indicateurs) => {
      for (const ind of inds) {
        insertInd.run(analyseId, ind.nom, ind.categorie || null, ind.valeur, ind.valeur_texte,
          ind.unite, ind.ref_min, ind.ref_max, ind.ref_texte)
      }
    })(parsed.indicateurs)

    const response = NextResponse.json({
      patient_id: patientId,
      analyse_id: analyseId,
      date_analyse: dateToUse,
      indicateurs_count: parsed.indicateurs.length,
      is_anonymous: !session?.user?.id,
      parsed: {
        patient_nom: parsed.patient_nom,
        patient_prenom: parsed.patient_prenom,
        patient_date_naissance: parsed.patient_date_naissance,
      },
    })

    // Set anonymous session cookie (1 year)
    if (!session?.user?.id && sessionToken) {
      response.cookies.set('bio_session', sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      })
    }

    return response
  } catch (err) {
    console.error('[upload]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
