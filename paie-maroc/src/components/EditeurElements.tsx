'use client'
import { useState } from 'react'

interface Props {
  prefixe: string
  rubriques: { code: string; libelle: string; sens: string }[]
  initial: { code: string; montant: number }[]
}

/** Liste éditable d'éléments de paie (rubrique + montant) envoyée via le formulaire parent. */
export default function EditeurElements({ prefixe, rubriques, initial }: Props) {
  const [lignes, setLignes] = useState(initial.length ? initial : [])
  const maj = (i: number, champ: 'code' | 'montant', valeur: string) =>
    setLignes((l) => l.map((x, j) => (j === i ? { ...x, [champ]: champ === 'montant' ? Number(valeur) : valeur } : x)))
  return (
    <div className="space-y-2">
      {lignes.map((l, i) => (
        <div key={i} className="flex gap-2">
          <select name={`${prefixe}_code`} value={l.code} onChange={(e) => maj(i, 'code', e.target.value)} className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm">
            <option value="">— Rubrique —</option>
            {rubriques.map((r) => (
              <option key={r.code} value={r.code}>
                {r.code} - {r.libelle} {r.sens === 'RETENUE' ? '(retenue)' : ''}
              </option>
            ))}
          </select>
          <input name={`${prefixe}_montant`} type="number" step="0.01" value={l.montant || ''} onChange={(e) => maj(i, 'montant', e.target.value)} placeholder="Montant" className="w-32 rounded-md border border-gray-300 px-2 py-1.5 text-right text-sm" />
          <button type="button" onClick={() => setLignes((x) => x.filter((_, j) => j !== i))} className="rounded-md border border-gray-300 px-2 text-sm text-red-700 hover:bg-red-50" aria-label="Supprimer la ligne">
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={() => setLignes((l) => [...l, { code: '', montant: 0 }])} className="text-sm font-medium text-emerald-800 hover:underline">
        + Ajouter un élément
      </button>
    </div>
  )
}
