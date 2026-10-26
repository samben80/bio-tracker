import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const { comparerVersions, installerRelease, listerReleases } = await import('./version')

const releases = [
  { tag_name: 'paie-v1.2.0', name: 'Paie Maroc 1.2.0', body: '', published_at: '2026-11-02T10:00:00Z', html_url: 'u', draft: false, prerelease: false },
  { tag_name: 'paie-v1.10.0', name: 'Paie Maroc 1.10.0', body: '', published_at: '2026-12-01T10:00:00Z', html_url: 'u', draft: false, prerelease: false },
  { tag_name: 'paie-v2.0.0', name: 'brouillon', body: '', published_at: '2026-12-05T10:00:00Z', html_url: 'u', draft: true, prerelease: false },
  { tag_name: 'bio-v3.0.0', name: 'autre appli', body: '', published_at: '2026-12-05T10:00:00Z', html_url: 'u', draft: false, prerelease: false },
]

function simulerGithub(refExiste: boolean) {
  const appels: { methode: string; url: string; corps?: string }[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    appels.push({ methode: init.method ?? 'GET', url, corps: init.body as string })
    const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status })
    if (url.endsWith('/releases?per_page=50')) return json(releases)
    if (url.includes('/commits/')) return json({ sha: `sha-${decodeURIComponent(url.split('/commits/')[1])}` })
    if (url.includes('/git/refs/heads/production')) return refExiste ? json({}) : json({ message: 'Reference does not exist' }, 422)
    if (url.endsWith('/git/refs')) return json({}, 201)
    return json({}, 404)
  }))
  return appels
}

describe('versions publiées', () => {
  afterEach(() => vi.unstubAllGlobals())
  process.env.GITHUB_REPO = 'org/depot'
  process.env.GITHUB_TOKEN = 'jeton'

  it('compare les numéros de version numériquement', () => {
    expect(comparerVersions('1.10.0', '1.2.0')).toBeGreaterThan(0)
    expect(comparerVersions('1.2.0', '1.2.0')).toBe(0)
  })

  it('ne retient que les releases publiées de l\'application, la plus récente en premier', async () => {
    simulerGithub(true)
    const r = await listerReleases()
    expect(r.map((x) => x.tag)).toEqual(['paie-v1.10.0', 'paie-v1.2.0'])
    expect(r[0].commit).toBe('sha-paie-v1.10.0')
  })

  it('déplace la branche de production sur le commit de la release', async () => {
    const appels = simulerGithub(true)
    await installerRelease('paie-v1.2.0')
    const patch = appels.find((a) => a.methode === 'PATCH')!
    expect(patch.url).toContain('/repos/org/depot/git/refs/heads/production')
    expect(JSON.parse(patch.corps!)).toEqual({ sha: 'sha-paie-v1.2.0', force: true })
  })

  it('crée la branche de production lors de la première installation', async () => {
    const appels = simulerGithub(false)
    await installerRelease('paie-v1.10.0')
    const post = appels.find((a) => a.methode === 'POST')!
    expect(JSON.parse(post.corps!)).toEqual({ ref: 'refs/heads/production', sha: 'sha-paie-v1.10.0' })
  })

  it('refuse une version inconnue', async () => {
    simulerGithub(true)
    await expect(installerRelease('paie-v9.9.9')).rejects.toThrow('introuvable')
  })
})
