'use client'

import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, Legend,
} from 'recharts'
import { IndicateurEvolution, getZone, getZoneColor } from '@/lib/types'
import { format, parse } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props {
  indicateur: IndicateurEvolution
  height?: number
}

function formatDate(d: string) {
  try {
    const parsed = parse(d, 'dd-MM-yyyy', new Date())
    return format(parsed, 'dd MMM yy', { locale: fr })
  } catch {
    return d
  }
}

function computeYDomain(indicateur: IndicateurEvolution): [number, number] {
  const values = indicateur.points.map(p => p.valeur).filter((v): v is number => v !== null)
  const { ref_min, ref_max } = indicateur
  const all = [...values]
  if (ref_min !== null) all.push(ref_min)
  if (ref_max !== null) all.push(ref_max)
  if (all.length === 0) return [0, 100]

  const min = Math.min(...all)
  const max = Math.max(...all)
  const pad = (max - min) * 0.3 || max * 0.3 || 1
  return [Math.max(0, min - pad), max + pad * 2]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomDot = (props: any) => {
  const { cx, cy, payload, indicateur } = props
  if (!cy || !cx || payload.valeur === null) return null
  const zone = getZone(payload.valeur, indicateur.ref_min, indicateur.ref_max)
  const color = getZoneColor(zone).dot
  return <circle cx={cx} cy={cy} r={6} fill={color} stroke="white" strokeWidth={2} />
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, indicateur }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const zone = getZone(d.valeur, indicateur.ref_min, indicateur.ref_max)
  const colors = getZoneColor(zone)
  const label = zone === 'normal' ? 'Normal' : zone === 'borderline' ? 'Hors norme' : 'Anormal'

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm min-w-[160px]">
      <p className="font-semibold text-gray-700 mb-1">{formatDate(d.date)}</p>
      <p className="text-gray-900 font-bold text-lg">
        {d.valeur_texte ?? d.valeur} <span className="text-gray-500 text-sm font-normal">{indicateur.unite}</span>
      </p>
      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.badge}`}>
        {label}
      </span>
    </div>
  )
}

export default function IndicatorChart({ indicateur, height = 280 }: Props) {
  const { ref_min, ref_max } = indicateur
  const [yMin, yMax] = computeYDomain(indicateur)

  const data = indicateur.points.map(p => ({
    ...p,
    date_fmt: formatDate(p.date),
  }))

  // Zone limits
  const dangerHighStart = ref_max !== null ? ref_max * 2 : null
  const borderlineHighStart = ref_max
  const borderlineLowEnd = ref_min
  const dangerLowEnd = ref_min !== null ? ref_min * 0.7 : null

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

        {/* Normal zone — green */}
        {ref_min !== null && ref_max !== null && (
          <ReferenceArea y1={ref_min} y2={ref_max} fill="#dcfce7" fillOpacity={0.6} />
        )}
        {ref_max !== null && ref_min === null && (
          <ReferenceArea y1={yMin} y2={ref_max} fill="#dcfce7" fillOpacity={0.6} />
        )}
        {ref_min !== null && ref_max === null && (
          <ReferenceArea y1={ref_min} y2={yMax} fill="#dcfce7" fillOpacity={0.6} />
        )}

        {/* Borderline zone — yellow */}
        {borderlineHighStart !== null && dangerHighStart !== null && (
          <ReferenceArea y1={borderlineHighStart} y2={dangerHighStart} fill="#fef9c3" fillOpacity={0.7} />
        )}
        {dangerLowEnd !== null && borderlineLowEnd !== null && (
          <ReferenceArea y1={dangerLowEnd} y2={borderlineLowEnd} fill="#fef9c3" fillOpacity={0.7} />
        )}

        {/* Danger zone — red */}
        {dangerHighStart !== null && (
          <ReferenceArea y1={dangerHighStart} y2={yMax} fill="#fee2e2" fillOpacity={0.7} />
        )}
        {dangerLowEnd !== null && (
          <ReferenceArea y1={yMin} y2={dangerLowEnd} fill="#fee2e2" fillOpacity={0.7} />
        )}

        {/* Reference lines */}
        {ref_max !== null && (
          <ReferenceLine y={ref_max} stroke="#16a34a" strokeDasharray="5 3" strokeWidth={1.5}
            label={{ value: `Max: ${ref_max}`, position: 'insideTopRight', fill: '#16a34a', fontSize: 11 }} />
        )}
        {ref_min !== null && (
          <ReferenceLine y={ref_min} stroke="#16a34a" strokeDasharray="5 3" strokeWidth={1.5}
            label={{ value: `Min: ${ref_min}`, position: 'insideBottomRight', fill: '#16a34a', fontSize: 11 }} />
        )}

        <XAxis dataKey="date_fmt" tick={{ fontSize: 12, fill: '#6b7280' }} />
        <YAxis domain={[yMin, yMax]} tick={{ fontSize: 12, fill: '#6b7280' }}
          tickFormatter={v => v.toFixed(1)} width={55} />

        <Tooltip content={<CustomTooltip indicateur={indicateur} />} />

        <Line
          type="monotone"
          dataKey="valeur"
          stroke="#6366f1"
          strokeWidth={2.5}
          dot={<CustomDot indicateur={indicateur} />}
          activeDot={false}
          connectNulls
        />

        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={() => indicateur.nom}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
