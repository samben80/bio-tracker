/** Majuscules sans accents, pour les fichiers EDI à largeur fixe. */
export function ascii(s: string): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .toUpperCase()
}

/** Champ alphanumérique cadré à gauche, complété par des espaces. */
export const alpha = (v: string, n: number) => ascii(v).slice(0, n).padEnd(n, ' ')

/** Champ numérique cadré à droite, complété par des zéros. */
export function num(v: number | string, n: number): string {
  const s = String(typeof v === 'number' ? Math.round(v) : v.replace(/\D/g, ''))
  if (s.length > n) throw new Error(`Valeur ${s} trop longue pour un champ de ${n} positions`)
  return s.padStart(n, '0')
}

/** Montant en centimes (sans séparateur décimal). */
export const centimes = (montant: number) => Math.round(montant * 100)

export const xmlEsc = (s: string | number) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function csv(lignes: (string | number)[][]): string {
  const cell = (v: string | number) => {
    const s = typeof v === 'number' ? v.toFixed(2).replace('.', ',') : v ?? ''
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  // BOM pour une ouverture correcte dans Excel
  return '﻿' + lignes.map((l) => l.map(cell).join(';')).join('\r\n')
}

export const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

export const libellePeriode = (id: string) => {
  const [a, m] = id.split('-').map(Number)
  return `${MOIS[m - 1]} ${a}`
}

/** « de septembre 2026 » / « d'octobre 2026 » */
export const dePeriode = (id: string) => {
  const l = libellePeriode(id).toLowerCase()
  return /^[aeiou]/.test(l) ? `d'${l}` : `de ${l}`
}

export const mad = (n: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0)

export const dateFr = (iso: string) => (iso ? new Date(iso + 'T00:00:00Z').toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '')
