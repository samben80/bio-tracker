'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PatientRow {
  id: number; nom: string; prenom: string | null
  date_naissance: string | null; user_email: string | null
  nb_analyses: number; derniere_analyse: string | null
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'admin') { router.push('/'); return }
    fetch('/api/patients').then(r => r.json()).then(d => { setPatients(d); setLoading(false) })
  }, [session, status, router])

  if (status === 'loading' || loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
  }

  const filtered = patients.filter(p =>
    `${p.nom} ${p.prenom} ${p.user_email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel Administrateur</h1>
          <p className="text-sm text-gray-500">{patients.length} patient{patients.length > 1 ? 's' : ''} enregistrés</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, prénom ou email…"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Aucun patient trouvé</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Compte</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Analyses</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dernière</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-bold text-xs">
                        {(p.prenom?.[0] ?? p.nom[0]).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{p.prenom} {p.nom}</p>
                        {p.date_naissance && <p className="text-xs text-gray-400">{p.date_naissance}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.user_email ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-indigo-50 text-indigo-600 text-xs font-medium px-2 py-0.5 rounded-full">
                      {p.nb_analyses}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.derniere_analyse ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/patients/${p.id}`}
                      className="text-xs text-indigo-600 hover:underline font-medium">
                      Voir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
