import { notFound } from 'next/navigation'
import BoutonImprimer from '@/components/BoutonImprimer'
import BulletinPaie from '@/components/BulletinPaie'
import { Lien } from '@/components/ui'
import { cumulsAnnuels, soldeConges } from '@/lib/paie/agregats'
import { lireBase } from '@/lib/store'

export default async function TousLesBulletins(props: PageProps<'/paie/[periode]/bulletins'>) {
  const { periode: id } = await props.params
  const db = await lireBase()
  const p = db.periodes.find((x) => x.id === id)
  if (!p) notFound()
  const cumuls = cumulsAnnuels(db, p.annee, p.mois)
  const liste = Object.values(p.bulletins)
    .map((b) => ({ b, s: db.salaries.find((x) => x.id === b.salarieId)! }))
    .filter((x) => x.s)
    .sort((a, b) => a.s.matricule.localeCompare(b.s.matricule))
  return (
    <div className="space-y-6">
      <div className="no-print flex gap-2">
        <Lien href={`/paie/${id}`}>Retour à la période</Lien>
        <BoutonImprimer libelle={`Imprimer les ${liste.length} bulletins`} />
      </div>
      {liste.map(({ b, s }) => (
        <BulletinPaie key={s.id} societe={db.societe} salarie={s} bulletin={b} cumul={cumuls.get(s.id)} conges={soldeConges(db, s.id, id)} />
      ))}
    </div>
  )
}
