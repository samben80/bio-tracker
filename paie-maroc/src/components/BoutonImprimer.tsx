'use client'

export default function BoutonImprimer({ libelle = 'Imprimer / PDF' }: { libelle?: string }) {
  return (
    <button onClick={() => window.print()} className="no-print inline-flex items-center rounded-md bg-emerald-800 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-900">
      {libelle}
    </button>
  )
}
