import { libellePeriode } from '@/lib/exports/format'
import type { PeriodePaie } from '@/lib/paie/types'

/** Sélecteur de période en GET (fonctionne sans JavaScript). */
export default function SelecteurPeriode({ periodes, valeur, extra }: { periodes: PeriodePaie[]; valeur?: string; extra?: React.ReactNode }) {
  return (
    <form className="no-print flex flex-wrap items-center gap-2">
      <select name="periode" defaultValue={valeur} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm">
        {[...periodes].sort((a, b) => b.id.localeCompare(a.id)).map((p) => (
          <option key={p.id} value={p.id}>{libellePeriode(p.id)}</option>
        ))}
      </select>
      {extra}
      <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">Afficher</button>
    </form>
  )
}
