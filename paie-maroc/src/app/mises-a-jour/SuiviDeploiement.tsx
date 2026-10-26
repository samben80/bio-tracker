'use client'
import { useEffect, useState } from 'react'

/** Interroge /api/version jusqu'à ce que la production serve le commit installé, puis recharge. */
export default function SuiviDeploiement({ tag, commit }: { tag: string; commit: string }) {
  const [secondes, setSecondes] = useState(0)
  const [termine, setTermine] = useState(false)

  useEffect(() => {
    const debut = Date.now()
    const timer = setInterval(async () => {
      setSecondes(Math.round((Date.now() - debut) / 1000))
      try {
        const r = await fetch('/api/version', { cache: 'no-store' })
        if (r.ok && (await r.json()).commit === commit) {
          clearInterval(timer)
          setTermine(true)
          setTimeout(() => window.location.assign('/mises-a-jour'), 1500)
        }
      } catch {
        // déploiement en cours de bascule : on réessaie
      }
    }, 10000)
    return () => clearInterval(timer)
  }, [commit])

  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${termine ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-sky-200 bg-sky-50 text-sky-900'}`}>
      {termine ? (
        <>Version {tag} installée. Rechargement…</>
      ) : (
        <>
          Installation de <strong>{tag}</strong> en cours : Vercel construit la nouvelle version ({secondes} s écoulées, 1 à 3 minutes
          en général). Les utilisateurs continuent sur la version actuelle jusqu&apos;à la bascule, qui est instantanée. Cette page se rechargera
          automatiquement.
        </>
      )}
    </div>
  )
}
