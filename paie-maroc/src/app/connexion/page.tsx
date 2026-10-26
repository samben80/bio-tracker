import { accesBloque } from '@/lib/session'
import { infosVersion } from '@/lib/version'
import FormulaireConnexion from './FormulaireConnexion'

export default async function Connexion(props: PageProps<'/connexion'>) {
  const { suite = '/' } = (await props.searchParams) as { suite?: string }
  const v = infosVersion()
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-emerald-950">Paie Maroc</h1>
        <p className="mb-6 text-sm text-gray-500">{v.libelleEnvironnement} · {v.libelleVersion}</p>
        {accesBloque() ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            Accès fermé : définissez PAIE_MOT_DE_PASSE, PAIE_MOT_DE_PASSE_ADMIN et AUTH_SECRET dans les variables d&apos;environnement Vercel.
          </p>
        ) : (
          <FormulaireConnexion suite={suite} />
        )}
      </div>
    </div>
  )
}
