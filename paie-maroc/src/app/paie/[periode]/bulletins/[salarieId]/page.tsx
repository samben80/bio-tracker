import { notFound } from 'next/navigation'
import BoutonImprimer from '@/components/BoutonImprimer'
import BulletinPaie from '@/components/BulletinPaie'
import { Alerte, Lien } from '@/components/ui'
import { cumulsAnnuels, soldeConges } from '@/lib/paie/agregats'
import { lireBase } from '@/lib/store'

export default async function PageBulletin(props: PageProps<'/paie/[periode]/bulletins/[salarieId]'>) {
  const { periode: id, salarieId } = await props.params
  const db = await lireBase()
  const p = db.periodes.find((x) => x.id === id)
  const s = db.salaries.find((x) => x.id === salarieId)
  if (!p || !s) notFound()
  const b = p.bulletins[s.id]
  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap gap-2">
        <Lien href={`/paie/${id}`}>Retour à la période</Lien>
        {p.statut !== 'CLOTUREE' && <Lien href={`/paie/${id}/saisie/${s.id}`}>Modifier les variables</Lien>}
        {b && <BoutonImprimer />}
      </div>
      {b ? (
        <BulletinPaie societe={db.societe} salarie={s} bulletin={b} cumul={cumulsAnnuels(db, p.annee, p.mois).get(s.id)} conges={soldeConges(db, s.id, id)} />
      ) : (
        <Alerte type="attention">Bulletin non calculé : lancez le calcul de la période.</Alerte>
      )}
    </div>
  )
}
