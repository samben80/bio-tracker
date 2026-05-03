import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { parsePdf } from '@/lib/pdf-parser'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 30

type IdRow = { id: number }

async function q<T>(promise: Promise<unknown>): Promise<T[]> {
  return promise as unknown as T[]
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const patientIdRaw = formData.get('patient_id') as string | null

    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await parsePdf(buffer)

    const session = await getServerSession(authOptions)
    const sql = await getDb()
    const cookieStore = await cookies()

    let sessionToken = cookieStore.get('bio_session')?.value
    if (!sessionToken && !session?.user?.id) {
      sessionToken = uuidv4()
    }

    let patientId: number

    if (patientIdRaw) {
      patientId = parseInt(patientIdRaw)
    } else if (session?.user?.id) {
      const userId = parseInt(session.user.id)
      const parsedNom = (parsed.patient_nom || '').toUpperCase().trim()
      const parsedPrenom = (parsed.patient_prenom || '').trim()

      const rows = await q<IdRow>(sql`
        SELECT id FROM patients
        WHERE user_id = ${userId} AND nom = ${parsedNom}
        AND (prenom = ${parsedPrenom} OR (prenom IS NULL AND ${parsedPrenom} = ''))
      `)
      if (rows[0]) {
        patientId = rows[0].id
      } else {
        const r = await q<IdRow>(sql`
          INSERT INTO patients (user_id, nom, prenom, date_naissance, dossier_ref, telephone, email, relation)
          VALUES (${userId}, ${parsedNom || 'Patient'}, ${parsed.patient_prenom ?? null},
                  ${parsed.patient_date_naissance ?? null}, ${parsed.dossier_ref ?? null},
                  ${parsed.telephone ?? null}, ${parsed.email ?? null}, 'self')
          RETURNING id
        `)
        patientId = r[0].id
      }
    } else {
      const parsedNom = (parsed.patient_nom || '').toUpperCase().trim()
      const parsedPrenom = (parsed.patient_prenom || '').trim()

      const rows = await q<IdRow>(sql`
        SELECT id FROM patients
        WHERE session_token = ${sessionToken!} AND user_id IS NULL AND nom = ${parsedNom}
        AND (prenom = ${parsedPrenom} OR (prenom IS NULL AND ${parsedPrenom} = ''))
      `)
      if (rows[0]) {
        patientId = rows[0].id
      } else {
        const r = await q<IdRow>(sql`
          INSERT INTO patients (session_token, nom, prenom, date_naissance, dossier_ref, telephone, email)
          VALUES (${sessionToken!}, ${parsedNom || 'Patient anonyme'}, ${parsed.patient_prenom ?? null},
                  ${parsed.patient_date_naissance ?? null}, ${parsed.dossier_ref ?? null},
                  ${parsed.telephone ?? null}, ${parsed.email ?? null})
          RETURNING id
        `)
        patientId = r[0].id
      }
    }

    const dateToUse = parsed.date_analyse ?? new Date().toISOString().slice(0, 10)
    const existingRows = await q<IdRow>(sql`
      SELECT id FROM analyses WHERE patient_id = ${patientId} AND date_analyse = ${dateToUse}
    `)

    let analyseId: number
    if (existingRows[0]) {
      analyseId = existingRows[0].id
      await sql`DELETE FROM indicateurs WHERE analyse_id = ${analyseId}`
    } else {
      const r = await q<IdRow>(sql`
        INSERT INTO analyses (patient_id, date_analyse, laboratoire, fichier_nom)
        VALUES (${patientId}, ${dateToUse}, ${parsed.laboratoire ?? null}, ${file.name})
        RETURNING id
      `)
      analyseId = r[0].id
    }

    for (const ind of parsed.indicateurs) {
      await sql`
        INSERT INTO indicateurs (analyse_id, nom, categorie, valeur, valeur_texte, unite, ref_min, ref_max, ref_texte)
        VALUES (${analyseId}, ${ind.nom}, ${ind.categorie || null}, ${ind.valeur}, ${ind.valeur_texte},
                ${ind.unite}, ${ind.ref_min}, ${ind.ref_max}, ${ind.ref_texte})
      `
    }

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
