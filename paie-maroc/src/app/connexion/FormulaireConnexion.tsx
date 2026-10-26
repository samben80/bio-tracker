'use client'
import { useActionState } from 'react'
import { seConnecter } from './actions'

export default function FormulaireConnexion({ suite }: { suite: string }) {
  const [erreur, action, enCours] = useActionState(seConnecter, null)
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="suite" value={suite} />
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">Mot de passe</span>
        <input name="motDePasse" type="password" required autoFocus autoComplete="current-password" className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700" />
      </label>
      {erreur && <p className="text-sm text-red-700">{erreur}</p>}
      <button disabled={enCours} className="w-full rounded-md bg-emerald-800 px-3 py-2 font-medium text-white hover:bg-emerald-900 disabled:opacity-50">
        {enCours ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  )
}
