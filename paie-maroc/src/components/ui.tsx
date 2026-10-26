import Link from 'next/link'
import type { ReactNode } from 'react'

export function PageHeader({ titre, sousTitre, actions }: { titre: string; sousTitre?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{titre}</h1>
        {sousTitre && <p className="mt-1 text-sm text-gray-500">{sousTitre}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ titre, children, actions, className = '' }: { titre?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
      {(titre || actions) && (
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800">{titre}</h2>
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Stat({ label, valeur, detail }: { label: string; valeur: ReactNode; detail?: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-gray-900 num !text-left">{valeur}</div>
      {detail && <div className="mt-1 text-xs text-gray-500">{detail}</div>}
    </div>
  )
}

const btn = {
  primaire: 'bg-emerald-800 text-white hover:bg-emerald-900',
  secondaire: 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50',
  danger: 'border border-red-300 bg-white text-red-700 hover:bg-red-50',
}

export function Bouton({ children, variante = 'primaire', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: keyof typeof btn }) {
  return (
    <button {...props} className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50 ${btn[variante]} ${props.className ?? ''}`}>
      {children}
    </button>
  )
}

export function Lien({ href, children, variante = 'secondaire', ...rest }: { href: string; children: ReactNode; variante?: keyof typeof btn; target?: string; download?: boolean }) {
  return (
    <Link href={href} {...rest} className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium ${btn[variante]}`}>
      {children}
    </Link>
  )
}

export function Champ({ label, children, aide, className = '' }: { label: string; children: ReactNode; aide?: string; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block font-medium text-gray-700">{label}</span>
      {children}
      {aide && <span className="mt-1 block text-xs text-gray-500">{aide}</span>}
    </label>
  )
}

const inputCls = 'w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

export function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: [string, string][] }) {
  return (
    <select {...props} className={`${inputCls} ${props.className ?? ''}`}>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  )
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

const badges = {
  vert: 'bg-emerald-100 text-emerald-800',
  orange: 'bg-amber-100 text-amber-800',
  rouge: 'bg-red-100 text-red-800',
  gris: 'bg-gray-100 text-gray-700',
  bleu: 'bg-sky-100 text-sky-800',
}

export function Badge({ couleur = 'gris', children }: { couleur?: keyof typeof badges; children: ReactNode }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${badges[couleur]}`}>{children}</span>
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm [&_td]:border-b [&_td]:border-gray-100 [&_td]:px-2 [&_td]:py-1.5 [&_th]:border-b [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:px-2 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:text-gray-600">
        {children}
      </table>
    </div>
  )
}

export function Alerte({ type = 'info', children }: { type?: 'info' | 'attention' | 'erreur'; children: ReactNode }) {
  const c = { info: 'border-sky-200 bg-sky-50 text-sky-900', attention: 'border-amber-200 bg-amber-50 text-amber-900', erreur: 'border-red-200 bg-red-50 text-red-900' }[type]
  return <div className={`rounded-md border px-4 py-3 text-sm ${c}`}>{children}</div>
}

/** Lien de téléchargement (fichier généré par une route API, hors navigation client). */
export function Telecharger({ href, children, variante = 'primaire' }: { href: string; children: ReactNode; variante?: keyof typeof btn }) {
  return (
    <a href={href} className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium ${btn[variante]}`}>
      ⬇ {children}
    </a>
  )
}
