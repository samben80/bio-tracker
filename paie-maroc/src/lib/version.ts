import 'server-only'
import pkg from '../../package.json'

// Cycle de publication :
//   main (ou toute autre branche)  → déploiement « Preview » Vercel = environnement de test
//   tag paie-vX.Y.Z + release GitHub → version publiée, installable
//   branche « production »          → déploiement « Production » Vercel = version des utilisateurs
// Le bouton « Installer » déplace la branche production sur le commit de la release choisie ;
// Vercel reconstruit alors la production. Les releases précédentes permettent de revenir en arrière.

const PREFIXE_TAG = process.env.PAIE_PREFIXE_TAG ?? 'paie-v'
const BRANCHE_PRODUCTION = process.env.PAIE_BRANCHE_PRODUCTION ?? 'production'

export function depotGithub(): string | null {
  if (process.env.GITHUB_REPO) return process.env.GITHUB_REPO
  const { VERCEL_GIT_REPO_OWNER: o, VERCEL_GIT_REPO_SLUG: r } = process.env
  return o && r ? `${o}/${r}` : null
}

export function infosVersion() {
  const env = process.env.VERCEL_ENV ?? 'development'
  const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? ''
  const branche = process.env.VERCEL_GIT_COMMIT_REF ?? ''
  return {
    version: pkg.version,
    commit,
    commitCourt: commit.slice(0, 7),
    branche,
    environnement: env as 'production' | 'preview' | 'development',
    libelleEnvironnement: env === 'production' ? 'Production' : env === 'preview' ? `Test${branche ? ` (${branche})` : ''}` : 'Développement local',
    libelleVersion: `v${pkg.version}${commit ? ` · ${commit.slice(0, 7)}` : ''}`,
    brancheProduction: BRANCHE_PRODUCTION,
  }
}

export interface Release {
  tag: string
  version: string
  nom: string
  notes: string
  publieeLe: string
  url: string
  commit: string
}

async function github<T>(chemin: string, init: RequestInit = {}): Promise<T> {
  const depot = depotGithub()
  if (!depot) throw new Error('Dépôt GitHub inconnu : définissez GITHUB_REPO (propriétaire/depot).')
  const r = await fetch(`https://api.github.com/repos/${depot}${chemin}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      ...init.headers,
    },
  })
  if (!r.ok) throw new Error(`GitHub ${r.status} sur ${chemin} : ${(await r.text()).slice(0, 200)}`)
  return (r.status === 204 ? null : await r.json()) as T
}

/** Compare deux versions X.Y.Z (négatif si a < b). */
export function comparerVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0)
  return 0
}

/** Versions publiées (releases GitHub non brouillon dont le tag commence par le préfixe), la plus récente en premier. */
export async function listerReleases(): Promise<Release[]> {
  const brutes = await github<{ tag_name: string; name: string; body: string; published_at: string; html_url: string; draft: boolean; prerelease: boolean }[]>('/releases?per_page=50')
  const releases = brutes
    .filter((r) => !r.draft && !r.prerelease && r.tag_name.startsWith(PREFIXE_TAG))
    .map((r) => ({ tag: r.tag_name, version: r.tag_name.slice(PREFIXE_TAG.length), nom: r.name || r.tag_name, notes: r.body ?? '', publieeLe: r.published_at, url: r.html_url, commit: '' }))
    .sort((a, b) => comparerVersions(b.version, a.version))
    .slice(0, 10)
  await Promise.all(
    releases.map(async (r) => {
      r.commit = (await github<{ sha: string }>(`/commits/${encodeURIComponent(r.tag)}`)).sha
    }),
  )
  return releases
}

/** Déplace la branche de production sur la release choisie : Vercel redéploie la production. */
export async function installerRelease(tag: string): Promise<Release> {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN manquant : impossible de publier la mise à jour.')
  const release = (await listerReleases()).find((r) => r.tag === tag)
  if (!release) throw new Error(`Version ${tag} introuvable parmi les releases publiées.`)
  const ref = `heads/${BRANCHE_PRODUCTION}`
  try {
    await github(`/git/refs/${ref}`, { method: 'PATCH', body: JSON.stringify({ sha: release.commit, force: true }) })
  } catch (e) {
    if (!String(e).includes('GitHub 422') && !String(e).includes('GitHub 404')) throw e
    // première installation : la branche n'existe pas encore
    await github('/git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/${ref}`, sha: release.commit }) })
  }
  if (process.env.VERCEL_DEPLOY_HOOK_URL) await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, { method: 'POST' })
  return release
}
