import { Alerte, Badge, Bouton, Card, PageHeader, Table, Telecharger } from '@/components/ui'
import { exigerSession } from '@/lib/auth'
import { dateFr } from '@/lib/exports/format'
import { typeStockage } from '@/lib/store'
import { comparerVersions, depotGithub, infosVersion, listerReleases, type Release } from '@/lib/version'
import { installerVersion } from './actions'
import SuiviDeploiement from './SuiviDeploiement'

export default async function MisesAJour(props: PageProps<'/mises-a-jour'>) {
  await exigerSession('admin')
  const q = (await props.searchParams) as { verifier?: string; installation?: string; commit?: string }
  const v = infosVersion()
  const peutInstaller = v.environnement === 'production' || process.env.PAIE_AUTORISER_MAJ === '1'

  let releases: Release[] = []
  let erreur = ''
  if (q.verifier || q.installation) {
    try {
      releases = await listerReleases()
    } catch (e) {
      erreur = e instanceof Error ? e.message : String(e)
    }
  }
  const courante = releases.find((r) => r.commit === v.commit)
  const reference = courante?.version ?? v.version
  const derniere = releases[0]
  const aJour = derniere && (derniere.commit === v.commit || comparerVersions(derniere.version, reference) <= 0)

  return (
    <div className="space-y-6">
      <PageHeader titre="Mises à jour" sousTitre="Version installée, versions publiées, installation et retour arrière." />
      {q.installation && q.commit && <SuiviDeploiement tag={q.installation} commit={q.commit} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card titre="Version installée">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-gray-500">Environnement</dt>
            <dd><Badge couleur={v.environnement === 'production' ? 'vert' : 'orange'}>{v.libelleEnvironnement}</Badge></dd>
            <dt className="text-gray-500">Version</dt><dd>{courante ? courante.nom : `v${v.version}`}</dd>
            <dt className="text-gray-500">Commit</dt><dd className="font-mono">{v.commitCourt || '-'}</dd>
            <dt className="text-gray-500">Stockage</dt><dd>{typeStockage()}</dd>
            <dt className="text-gray-500">Dépôt</dt><dd className="font-mono">{depotGithub() ?? 'non configuré'}</dd>
          </dl>
        </Card>
        <Card titre="Vérifier les mises à jour">
          <form className="mb-3">
            <input type="hidden" name="verifier" value="1" />
            <Bouton type="submit">Vérifier la dernière version publiée</Bouton>
          </form>
          {erreur && <Alerte type="erreur">{erreur}</Alerte>}
          {derniere && (aJour ? (
            <Alerte>Vous utilisez la dernière version publiée ({derniere.nom}).</Alerte>
          ) : (
            <Alerte type="attention">
              Nouvelle version disponible : <strong>{derniere.nom}</strong> (publiée le {dateFr(derniere.publieeLe.slice(0, 10))}).
              {peutInstaller ? ' Faites une sauvegarde avant de l\'installer.' : ' Elle s\'installe depuis la version de production.'}
            </Alerte>
          ))}
          {q.verifier && !erreur && releases.length === 0 && <Alerte>Aucune version publiée pour l&apos;instant.</Alerte>}
          {!peutInstaller && (
            <p className="mt-3 text-xs text-gray-500">
              Vous êtes sur l&apos;environnement de test : il suit automatiquement la branche de développement. Les utilisateurs restent sur la
              production tant qu&apos;une version n&apos;y est pas installée.
            </p>
          )}
        </Card>
      </div>

      {releases.length > 0 && (
        <Card titre="Versions publiées" actions={peutInstaller && <Telecharger href="/api/export/sauvegarde" variante="secondaire">Sauvegarder les données</Telecharger>}>
          <Table>
            <thead><tr><th>Version</th><th>Publiée le</th><th>Notes</th><th></th></tr></thead>
            <tbody>
              {releases.map((r) => {
                const installee = r.commit === v.commit
                const recente = comparerVersions(r.version, reference) > 0
                return (
                  <tr key={r.tag}>
                    <td className="whitespace-nowrap font-medium">
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-emerald-800 hover:underline">{r.nom}</a>
                      {installee && <> <Badge couleur="vert">Installée</Badge></>}
                    </td>
                    <td className="whitespace-nowrap">{dateFr(r.publieeLe.slice(0, 10))}</td>
                    <td className="max-w-xl whitespace-pre-line text-xs text-gray-600">{r.notes.slice(0, 600)}</td>
                    <td>
                      {peutInstaller && !installee && (
                        <form action={installerVersion.bind(null, r.tag)}>
                          <Bouton type="submit" variante={recente ? 'primaire' : 'secondaire'}>{recente ? 'Installer' : 'Revenir à cette version'}</Bouton>
                        </form>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  )
}
