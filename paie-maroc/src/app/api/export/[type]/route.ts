import { csvCimr, csvComptable, csvJournal, csvVirements } from '@/lib/exports/autres'
import { genererFichierBds, preparerDeclarationCnss } from '@/lib/exports/cnss'
import { genererXml9421 } from '@/lib/exports/ir'
import { lireBase } from '@/lib/store'

function fichier(contenu: string, nom: string, type: string) {
  return new Response(contenu, {
    headers: {
      'Content-Type': `${type}; charset=utf-8`,
      'Content-Disposition': `attachment; filename="${nom}"`,
      'Cache-Control': 'no-store',
    },
  })
}

export async function GET(req: Request, ctx: RouteContext<'/api/export/[type]'>) {
  const { type } = await ctx.params
  const q = new URL(req.url).searchParams
  const db = await lireBase()
  const periode = db.periodes.find((p) => p.id === q.get('periode'))
  const annee = Number(q.get('annee')) || new Date().getFullYear()
  const aff = db.societe.cnssAffiliation || 'XXXXXXX'

  switch (type) {
    case 'cnss': {
      if (!periode) break
      const d = preparerDeclarationCnss(db, periode)
      return fichier(genererFichierBds(db, d), `DS_${aff}_${periode.id.replace('-', '')}.txt`, 'text/plain')
    }
    case '9421':
      return fichier(genererXml9421(db, annee), `9421_${db.societe.identifiantFiscal || 'IF'}_${annee}.xml`, 'application/xml')
    case 'cimr': {
      const trimestre = Number(q.get('trimestre')) || 1
      return fichier(csvCimr(db, annee, trimestre), `CIMR_${db.societe.cimrAdherent || 'adherent'}_${annee}_T${trimestre}.csv`, 'text/csv')
    }
    case 'virements':
      if (!periode) break
      return fichier(csvVirements(db, periode), `virements_${periode.id}.csv`, 'text/csv')
    case 'comptabilite':
      if (!periode) break
      return fichier(csvComptable(periode), `ecritures_paie_${periode.id}.csv`, 'text/csv')
    case 'journal':
      if (!periode) break
      return fichier(csvJournal(db, periode), `journal_paie_${periode.id}.csv`, 'text/csv')
    case 'sauvegarde':
      return fichier(JSON.stringify(db, null, 2), `sauvegarde_paie_${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
  }
  return new Response('Export introuvable ou période inconnue', { status: 404 })
}
