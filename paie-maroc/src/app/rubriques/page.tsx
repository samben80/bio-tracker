import Link from 'next/link'
import { Badge, Bouton, Card, Champ, Input, Lien, PageHeader, Select, Table } from '@/components/ui'
import { libelleExo } from '@/lib/paie/libelles'
import type { Rubrique } from '@/lib/paie/types'
import { lireBase } from '@/lib/store'
import { enregistrerRubrique, reinitialiserRubriques } from '../actions'

const TYPES_EXO: [string, string][] = [
  ['AUCUN', 'Entièrement soumis'],
  ['TOTAL', 'Entièrement exonéré'],
  ['MONTANT', 'Exonéré jusqu\'à un montant mensuel'],
  ['POURCENT_BASE', 'Exonéré jusqu\'à % du salaire de base'],
  ['SMIG_HORAIRE_PAR_JOUR', 'Exonéré jusqu\'à N × SMIG horaire / jour'],
]

const VIDE: Rubrique = {
  code: '', libelle: '', sens: 'GAIN', nature: 'PRIME',
  exonerationIr: { type: 'AUCUN', valeur: 0 }, exonerationCnss: { type: 'AUCUN', valeur: 0 },
  soumisCimr: true, entreDansAnciennete: false, actif: true, description: '',
}

export default async function PageRubriques(props: PageProps<'/rubriques'>) {
  const { code, nouveau } = (await props.searchParams) as { code?: string; nouveau?: string }
  const { rubriques } = await lireBase()
  const edition = nouveau ? VIDE : rubriques.find((r) => r.code === code)

  return (
    <div className="space-y-6">
      <PageHeader
        titre="Rubriques de paie"
        sousTitre="Primes, indemnités, avantages et retenues, avec leur traitement fiscal (IR) et social (CNSS/AMO)."
        actions={<Lien href="/rubriques?nouveau=1" variante="primaire">Nouvelle rubrique</Lien>}
      />

      {edition && (
        <Card titre={nouveau ? 'Nouvelle rubrique' : `Rubrique ${edition.code}`}>
          <form action={enregistrerRubrique} className="grid gap-3 md:grid-cols-4">
            <input type="hidden" name="origine" value={nouveau ? '' : edition.code} />
            <Champ label="Code" aide="200-499 gains, 500-599 retenues"><Input name="code" defaultValue={edition.code} required /></Champ>
            <Champ label="Libellé" className="md:col-span-3"><Input name="libelle" defaultValue={edition.libelle} required /></Champ>
            <Champ label="Sens"><Select name="sens" defaultValue={edition.sens} options={[['GAIN', 'Gain'], ['RETENUE', 'Retenue sur net']]} /></Champ>
            <Champ label="Nature">
              <Select name="nature" defaultValue={edition.nature} options={[['PRIME', 'Prime / salaire'], ['INDEMNITE', 'Indemnité / remboursement de frais'], ['AVANTAGE_NATURE', 'Avantage en nature'], ['RETENUE_NET', 'Retenue sur net']]} />
            </Champ>
            <Champ label="Traitement IR"><Select name="exoIrType" defaultValue={edition.exonerationIr.type} options={TYPES_EXO} /></Champ>
            <Champ label="Valeur plafond IR"><Input name="exoIrValeur" type="number" step="0.01" defaultValue={edition.exonerationIr.valeur} /></Champ>
            <div />
            <div />
            <Champ label="Traitement CNSS / AMO"><Select name="exoCnssType" defaultValue={edition.exonerationCnss.type} options={TYPES_EXO} /></Champ>
            <Champ label="Valeur plafond CNSS"><Input name="exoCnssValeur" type="number" step="0.01" defaultValue={edition.exonerationCnss.valeur} /></Champ>
            <Champ label="Description" className="md:col-span-4"><Input name="description" defaultValue={edition.description} /></Champ>
            <div className="flex flex-wrap gap-4 text-sm md:col-span-4">
              <label className="flex items-center gap-2"><input type="checkbox" name="soumisCimr" defaultChecked={edition.soumisCimr} /> Soumis CIMR</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="entreDansAnciennete" defaultChecked={edition.entreDansAnciennete} /> Entre dans la base de la prime d&apos;ancienneté</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="actif" defaultChecked={edition.actif} /> Active</label>
            </div>
            <div className="flex gap-2 md:col-span-4">
              <Bouton type="submit">Enregistrer</Bouton>
              <Lien href="/rubriques">Annuler</Lien>
            </div>
          </form>
        </Card>
      )}

      <Card titre="Éléments calculés automatiquement">
        <p className="text-sm text-gray-600">
          100 Salaire de base · 105 Absences · 110-112 Heures supplémentaires · 120 Prime d&apos;ancienneté · 600-606 Cotisations CNSS, AMO,
          allocations familiales, TFP, CIMR, mutuelle · 700 IR · 800 Avance sur salaire · 900 Arrondi.
        </p>
      </Card>

      <Card titre={`Rubriques paramétrables (${rubriques.length})`} actions={<form action={reinitialiserRubriques}><Bouton variante="secondaire" type="submit">Restaurer les rubriques standard</Bouton></form>}>
        <Table>
          <thead>
            <tr><th>Code</th><th>Libellé</th><th>Sens</th><th>IR</th><th>CNSS/AMO</th><th>CIMR</th><th>Ancienneté</th><th></th></tr>
          </thead>
          <tbody>
            {rubriques.map((r) => (
              <tr key={r.code} className={r.actif ? '' : 'opacity-50'}>
                <td className="font-mono">{r.code}</td>
                <td>
                  {r.libelle}
                  {r.description && <div className="text-xs text-gray-500">{r.description}</div>}
                </td>
                <td><Badge couleur={r.sens === 'GAIN' ? 'vert' : 'rouge'}>{r.sens === 'GAIN' ? (r.nature === 'AVANTAGE_NATURE' ? 'Avantage' : 'Gain') : 'Retenue'}</Badge></td>
                <td className="whitespace-nowrap">{r.sens === 'GAIN' ? libelleExo(r.exonerationIr) : '-'}</td>
                <td className="whitespace-nowrap">{r.sens === 'GAIN' ? libelleExo(r.exonerationCnss) : '-'}</td>
                <td>{r.soumisCimr ? 'Oui' : 'Non'}</td>
                <td>{r.entreDansAnciennete ? 'Oui' : 'Non'}</td>
                <td><Link href={`/rubriques?code=${r.code}`} className="text-emerald-800 hover:underline">Modifier</Link></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
