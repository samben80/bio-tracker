'use client'

import { IndicateurEvolution, getZone, getZoneColor } from '@/lib/types'
import { SparklineChart } from './SparklineChart'

interface Props {
  indicateur: IndicateurEvolution
  onClick?: () => void
}

export function IndicatorCard({ indicateur, onClick }: Props) {
  const latest = indicateur.points[indicateur.points.length - 1]
  const zone = getZone(latest?.valeur ?? null, indicateur.ref_min, indicateur.ref_max)
  const colors = getZoneColor(zone)
  const label = zone === 'normal' ? 'Normal' : zone === 'borderline' ? 'Hors norme' : 'Anormal'

  const prev = indicateur.points.length > 1 ? indicateur.points[indicateur.points.length - 2] : null
  let trend: 'up' | 'down' | 'stable' | null = null
  if (prev?.valeur !== null && latest?.valeur !== null && prev && latest) {
    const diff = (latest.valeur ?? 0) - (prev.valeur ?? 0)
    if (Math.abs(diff) < 0.01) trend = 'stable'
    else trend = diff > 0 ? 'up' : 'down'
  }

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all group
        ${colors.bg} border-opacity-30`}
      style={{ borderColor: colors.dot + '40' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5 truncate">
            {indicateur.nom}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-gray-900">
              {latest?.valeur_texte ?? latest?.valeur ?? '—'}
            </span>
            {indicateur.unite && (
              <span className="text-sm text-gray-500">{indicateur.unite}</span>
            )}
            {trend === 'up' && <span className="text-xs text-amber-500">↑</span>}
            {trend === 'down' && <span className="text-xs text-blue-500">↓</span>}
            {trend === 'stable' && <span className="text-xs text-gray-400">→</span>}
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${colors.badge}`}>
          {label}
        </span>
      </div>

      <SparklineChart indicateur={indicateur} />

      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>{indicateur.points.length} mesure{indicateur.points.length > 1 ? 's' : ''}</span>
        <span>
          {indicateur.ref_min !== null && indicateur.ref_max !== null
            ? `Réf: ${indicateur.ref_min}–${indicateur.ref_max}`
            : indicateur.ref_max !== null
            ? `Réf: < ${indicateur.ref_max}`
            : indicateur.ref_min !== null
            ? `Réf: > ${indicateur.ref_min}`
            : ''}
        </span>
      </div>
    </div>
  )
}
