'use client'

import { LineChart, Line, ResponsiveContainer, ReferenceLine } from 'recharts'
import { IndicateurEvolution, getZone, getZoneColor } from '@/lib/types'

interface Props {
  indicateur: IndicateurEvolution
}

export function SparklineChart({ indicateur }: Props) {
  if (indicateur.points.length < 2) return null

  const data = indicateur.points.map(p => ({ v: p.valeur }))

  // Color based on last value
  const last = indicateur.points[indicateur.points.length - 1]
  const zone = getZone(last.valeur, indicateur.ref_min, indicateur.ref_max)
  const color = getZoneColor(zone).dot

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        {indicateur.ref_max !== null && (
          <ReferenceLine y={indicateur.ref_max} stroke="#16a34a" strokeDasharray="3 2" strokeWidth={1} />
        )}
        {indicateur.ref_min !== null && (
          <ReferenceLine y={indicateur.ref_min} stroke="#16a34a" strokeDasharray="3 2" strokeWidth={1} />
        )}
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
