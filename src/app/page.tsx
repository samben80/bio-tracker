import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/db'
import Link from 'next/link'
import UploadDropzone from '@/components/UploadDropzone'

interface PatientRow {
  id: number; nom: string; prenom: string | null
  date_naissance: string | null; nb_analyses: number; derniere_analyse: string | null
  relation: string | null
}

type SessionType = { user: { id: string; email: string; role: string } } | null

async function getPatients(session: SessionType, sessionToken: string | null): Promise<PatientRow[]> {
  const db = getDb()
  if (session?.user?.role === 'admin') return []
  if (session?.user?.id) {
    return db.prepare(`
      SELECT p.*, COUNT(DISTINCT a.id) as nb_analyses, MAX(a.date_analyse) as derniere_analyse
      FROM patients p LEFT JOIN analyses a ON a.patient_id = p.id
      WHERE p.user_id = ?
      GROUP BY p.id ORDER BY p.relation = 'self' DESC, p.nom
    `).all(parseInt(session.user.id)) as PatientRow[]
  }
  if (sessionToken) {
    return db.prepare(`
      SELECT p.*, COUNT(DISTINCT a.id) as nb_analyses, MAX(a.date_analyse) as derniere_analyse
      FROM patients p LEFT JOIN analyses a ON a.patient_id = p.id
      WHERE p.session_token = ? AND p.user_id IS NULL
      GROUP BY p.id ORDER BY p.nom
    `).all(sessionToken) as PatientRow[]
  }
  return []
}

export default async function HomePage() {
  const rawSession = await getServerSession(authOptions)
  const session = rawSession as SessionType
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('bio_session')?.value ?? null
  const patients = await getPatients(session, sessionToken)
  const isAuthenticated = !!session?.user?.id
  const isAdmin = session?.user?.role === 'admin'

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAdmin ? 'Panel Admin' : isAuthenticated ? `Bonjour 👋` : 'BioTracker'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isAdmin
              ? 'Accès administrateur — '
              : isAuthenticated
              ? `Suivi de vos analyses biologiques`
              : 'Importez un compte rendu PDF pour visualiser vos indicateurs'}
          </p>
          {isAdmin && (
            <Link href="/admin" className="text-indigo-600 font-medium text-sm hover:underline">
              Voir tous les patients →
            </Link>
          )}
        </div>

        {isAuthenticated && !isAdmin && (
          <AddFamilyMember />
        )}
      </div>

      {/* Upload */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Importer un compte rendu
        </h2>
        <UploadDropzone isAuthenticated={isAuthenticated} />
      </div>

      {/* Patients */}
      {!isAdmin && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">
              {patients.length > 0
                ? isAuthenticated ? 'Mes patients' : 'Analyses en cours'
                : ''}
            </h2>
          </div>

          {patients.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">Aucune analyse importée</p>
              <p className="text-gray-400 text-sm mt-1">Déposez votre premier PDF ci-dessus</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {patients.map(p => (
                <Link key={p.id} href={`/patients/${p.id}`}
                  className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-200 transition-colors">
                      <span className="text-indigo-700 font-bold text-sm">
                        {(p.prenom?.[0] ?? p.nom[0]).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">{p.prenom} {p.nom}</p>
                        {p.relation && p.relation !== 'self' && (
                          <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full shrink-0">{p.relation}</span>
                        )}
                      </div>
                      {p.date_naissance && <p className="text-xs text-gray-400 mt-0.5">Né le {p.date_naissance}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                          {p.nb_analyses} analyse{p.nb_analyses > 1 ? 's' : ''}
                        </span>
                        {p.derniere_analyse && (
                          <span className="text-xs text-gray-400">Dernière: {p.derniere_analyse}</span>
                        )}
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Client component for adding a family member
function AddFamilyMember() {
  return (
    <Link href="/patients/add"
      className="flex items-center gap-2 text-sm font-medium text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-3 py-2 rounded-xl transition-colors">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      Ajouter un membre
    </Link>
  )
}
