'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UploadResult {
  indicateurs_count: number
  date_analyse: string
  patient_id: number
  is_anonymous: boolean
  parsed: { patient_nom: string; patient_prenom: string | null; patient_date_naissance: string | null }
}

interface Props {
  patientId?: number
  isAuthenticated?: boolean
  onSuccess?: (patientId: number) => void
}

export default function UploadDropzone({ patientId, isAuthenticated, onSuccess }: Props) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const upload = useCallback(async (file: File) => {
    setUploading(true)
    setError(null)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (patientId) fd.append('patient_id', String(patientId))

      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur upload')

      setResult(data)
      if (onSuccess) onSuccess(data.patient_id)
      else router.push(`/patients/${data.patient_id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setUploading(false)
    }
  }, [patientId, onSuccess, router])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') upload(file)
    else setError('Fichier PDF requis')
  }, [upload])

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload(file)
  }, [upload])

  return (
    <div className="space-y-3">
      <label
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all
          ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}
          ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <input type="file" accept=".pdf" className="hidden" onChange={onChange} />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-indigo-600 font-medium">Analyse du PDF en cours…</p>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-gray-700 font-semibold mb-1">Déposer le PDF ici</p>
            <p className="text-gray-400 text-sm">ou cliquer pour sélectionner</p>
            <p className="text-gray-300 text-xs mt-2">Compte rendu d&apos;analyses biologiques PDF</p>
          </>
        )}
      </label>

      {result && (
        <div className="space-y-3">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>
              <strong>{result.indicateurs_count} indicateur{result.indicateurs_count > 1 ? 's' : ''}</strong> importés
              du <strong>{result.date_analyse}</strong>
            </span>
          </div>

          {/* Invitation à créer un compte pour les anonymes */}
          {result.is_anonymous && !isAuthenticated && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">Sauvegardez vos analyses</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Créez un compte gratuit pour conserver l&apos;historique et suivre l&apos;évolution de vos indicateurs dans le temps.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/auth/register?nom=${encodeURIComponent(result.parsed.patient_nom)}&prenom=${encodeURIComponent(result.parsed.patient_prenom ?? '')}&email=${encodeURIComponent('')}`}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                    >
                      Créer un compte
                    </Link>
                    <Link href="/auth/signin"
                      className="text-xs font-medium text-indigo-600 hover:underline flex items-center">
                      J&apos;ai déjà un compte
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}
    </div>
  )
}
