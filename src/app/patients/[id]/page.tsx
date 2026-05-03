'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import UploadDropzone from '@/components/UploadDropzone'
import { IndicatorCard } from '@/components/IndicatorCard'
import IndicatorChart from '@/components/IndicatorChart'
import { Patient, Analyse, IndicateurEvolution, getZone, getZoneColor } from '@/lib/types'

export default function PatientPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [analyses, setAnalyses] = useState<(Analyse & { nb_indicateurs: number })[]>([])
  const [indicateurs, setIndicateurs] = useState<IndicateurEvolution[]>([])
  const [selected, setSelected] = useState<IndicateurEvolution | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterCategorie, setFilterCategorie] = useState<string>('all')
  const [filterZone, setFilterZone] = useState<string>('all')

  const load = async () => {
    setLoading(true)
    const [pRes, iRes] = await Promise.all([
      fetch(`/api/patients/${id}`),
      fetch(`/api/indicateurs/${id}`),
    ])
    if (pRes.ok) {
      const data = await pRes.json()
      setPatient(data.patient)
      setAnalyses(data.analyses)
    }
    if (iRes.ok) {
      const data = await iRes.json()
      setIndicateurs(data)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Patient introuvable</p>
        <Link href="/" className="text-indigo-600 mt-2 inline-block">← Retour</Link>
      </div>
    )
  }

  const categories = ['all', ...Array.from(new Set(
    indicateurs.flatMap(i => i.nom).map(() => '').filter(Boolean)
  ))]

  // Get last value for each indicator and determine zone
  const filteredIndicateurs = indicateurs.filter(ind => {
    if (filterZone === 'all') return true
    const last = ind.points[ind.points.length - 1]
    const zone = getZone(last?.valeur ?? null, ind.ref_min, ind.ref_max)
    return zone === filterZone
  })

  const stats = {
    total: indicateurs.length,
    normal: indicateurs.filter(ind => {
      const last = ind.points[ind.points.length - 1]
      return getZone(last?.valeur ?? null, ind.ref_min, ind.ref_max) === 'normal'
    }).length,
    borderline: indicateurs.filter(ind => {
      const last = ind.points[ind.points.length - 1]
      return getZone(last?.valeur ?? null, ind.ref_min, ind.ref_max) === 'borderline'
    }).length,
    danger: indicateurs.filter(ind => {
      const last = ind.points[ind.points.length - 1]
      return getZone(last?.valeur ?? null, ind.ref_min, ind.ref_max) === 'danger'
    }).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/" className="text-gray-400 hover:text-gray-600 mt-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {patient.prenom} {patient.nom}
          </h1>
          <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-gray-500">
            {patient.date_naissance && <span>Né le {patient.date_naissance}</span>}
            {patient.email && <span>{patient.email}</span>}
            {patient.telephone && <span>{patient.telephone}</span>}
            <span className="text-indigo-500 font-medium">{analyses.length} analyse{analyses.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setFilterZone(filterZone === 'normal' ? 'all' : 'normal')}
          className={`rounded-2xl border p-4 text-left transition-all ${filterZone === 'normal' ? 'ring-2 ring-emerald-400' : 'hover:shadow-sm'} bg-emerald-50 border-emerald-200`}>
          <p className="text-2xl font-bold text-emerald-700">{stats.normal}</p>
          <p className="text-sm text-emerald-600 font-medium mt-0.5">Normal</p>
        </button>
        <button onClick={() => setFilterZone(filterZone === 'borderline' ? 'all' : 'borderline')}
          className={`rounded-2xl border p-4 text-left transition-all ${filterZone === 'borderline' ? 'ring-2 ring-amber-400' : 'hover:shadow-sm'} bg-amber-50 border-amber-200`}>
          <p className="text-2xl font-bold text-amber-700">{stats.borderline}</p>
          <p className="text-sm text-amber-600 font-medium mt-0.5">Hors norme</p>
        </button>
        <button onClick={() => setFilterZone(filterZone === 'danger' ? 'all' : 'danger')}
          className={`rounded-2xl border p-4 text-left transition-all ${filterZone === 'danger' ? 'ring-2 ring-red-400' : 'hover:shadow-sm'} bg-red-50 border-red-200`}>
          <p className="text-2xl font-bold text-red-700">{stats.danger}</p>
          <p className="text-sm text-red-600 font-medium mt-0.5">Anormal</p>
        </button>
      </div>

      {/* Indicator chart modal/panel */}
      {selected && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{selected.nom}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {selected.unite && <span className="mr-3">Unité: <strong>{selected.unite}</strong></span>}
                {selected.ref_max !== null && selected.ref_min !== null
                  ? <span>Référence: <strong>{selected.ref_min} – {selected.ref_max}</strong></span>
                  : selected.ref_max !== null
                  ? <span>Référence: <strong>{'< '}{selected.ref_max}</strong></span>
                  : selected.ref_min !== null
                  ? <span>Référence: <strong>{'> '}{selected.ref_min}</strong></span>
                  : null}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Zone legend */}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-200 inline-block" />Normal</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-200 inline-block" />Hors norme</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-200 inline-block" />Anormal</span>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <IndicatorChart indicateur={selected} height={320} />

          {/* History table */}
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 font-medium mb-2">Historique des mesures</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs">
                    <th className="text-left pb-2 font-medium">Date</th>
                    <th className="text-right pb-2 font-medium">Valeur</th>
                    <th className="text-right pb-2 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {[...selected.points].reverse().map((pt, i) => {
                    const zone = getZone(pt.valeur, selected.ref_min, selected.ref_max)
                    const colors = getZoneColor(zone)
                    return (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="py-1.5 text-gray-600">{pt.date}</td>
                        <td className="py-1.5 text-right font-semibold text-gray-900">
                          {pt.valeur_texte ?? pt.valeur} <span className="text-gray-400 font-normal text-xs">{selected.unite}</span>
                        </td>
                        <td className="py-1.5 text-right">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                            {zone === 'normal' ? 'Normal' : zone === 'borderline' ? 'Hors norme' : 'Anormal'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Indicators grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">
            Indicateurs
            {filterZone !== 'all' && (
              <button onClick={() => setFilterZone('all')} className="ml-2 text-xs text-indigo-500 hover:underline">
                (voir tous)
              </button>
            )}
          </h2>
          <span className="text-xs text-gray-400">{filteredIndicateurs.length} indicateur{filteredIndicateurs.length > 1 ? 's' : ''}</span>
        </div>

        {filteredIndicateurs.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Aucun indicateur dans cette catégorie</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredIndicateurs.map(ind => (
              <IndicatorCard
                key={ind.nom}
                indicateur={ind}
                onClick={() => setSelected(ind)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload new analysis */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4">Ajouter une analyse</h2>
        <UploadDropzone patientId={parseInt(id)} onSuccess={() => load()} />
      </div>

      {/* Analyses history */}
      {analyses.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Historique des analyses</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {analyses.map(a => (
              <div key={a.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{a.date_analyse}</p>
                  {a.fichier_nom && <p className="text-xs text-gray-400">{a.fichier_nom}</p>}
                </div>
                <span className="text-sm text-gray-500">
                  {a.nb_indicateurs} indicateur{a.nb_indicateurs > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
