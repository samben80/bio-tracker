export interface Patient {
  id: number
  nom: string
  prenom: string | null
  date_naissance: string | null
  dossier_ref: string | null
  telephone: string | null
  email: string | null
  created_at: string
}

export interface Analyse {
  id: number
  patient_id: number
  date_analyse: string
  laboratoire: string | null
  fichier_nom: string | null
  created_at: string
}

export interface Indicateur {
  id: number
  analyse_id: number
  date_analyse: string
  nom: string
  categorie: string | null
  valeur: number | null
  valeur_texte: string | null
  unite: string | null
  ref_min: number | null
  ref_max: number | null
  ref_texte: string | null
}

export interface IndicateurEvolution {
  nom: string
  unite: string | null
  ref_min: number | null
  ref_max: number | null
  points: {
    date: string
    valeur: number | null
    valeur_texte: string | null
    analyse_id: number
  }[]
}

export type ZoneType = 'normal' | 'borderline' | 'danger'

export function getZone(valeur: number | null, ref_min: number | null, ref_max: number | null): ZoneType {
  if (valeur === null) return 'normal'
  if (ref_min !== null && ref_max !== null) {
    if (valeur < ref_min * 0.7 || valeur > ref_max * 1.5) return 'danger'
    if (valeur < ref_min || valeur > ref_max) return 'borderline'
    return 'normal'
  }
  if (ref_max !== null) {
    if (valeur > ref_max * 2) return 'danger'
    if (valeur > ref_max) return 'borderline'
    return 'normal'
  }
  if (ref_min !== null) {
    if (valeur < ref_min * 0.5) return 'danger'
    if (valeur < ref_min) return 'borderline'
    return 'normal'
  }
  return 'normal'
}

export function getZoneColor(zone: ZoneType) {
  switch (zone) {
    case 'normal': return { text: 'text-emerald-600', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', dot: '#10b981' }
    case 'borderline': return { text: 'text-amber-600', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700', dot: '#f59e0b' }
    case 'danger': return { text: 'text-red-600', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700', dot: '#ef4444' }
  }
}
