// Session signée (HMAC-SHA256) partagée par le proxy et le serveur.
// Comptes définis par variables d'environnement :
//   PAIE_MOT_DE_PASSE        utilisateurs (gestion RH, paie, déclarations)
//   PAIE_MOT_DE_PASSE_ADMIN  administrateur (en plus : paramètres, sauvegarde, mises à jour)
//   AUTH_SECRET              clé de signature des sessions (32 caractères ou plus)
// Sans mot de passe défini, l'authentification est désactivée hors Vercel (développement local)
// et l'accès est refusé sur Vercel.

export type Role = 'utilisateur' | 'admin'
export interface Session {
  role: Role
  exp: number
}

export const COOKIE_SESSION = 'paie_session'
export const DUREE_SESSION_S = 12 * 3600

export const authActive = () => Boolean(process.env.PAIE_MOT_DE_PASSE || process.env.PAIE_MOT_DE_PASSE_ADMIN)
export const accesBloque = () => !authActive() && Boolean(process.env.VERCEL)

const encoder = new TextEncoder()
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).toString('base64url')

async function signer(donnees: string): Promise<string> {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) throw new Error('AUTH_SECRET manquant ou trop court (32 caractères minimum)')
  const cle = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64url(await crypto.subtle.sign('HMAC', cle, encoder.encode(donnees)))
}

function egalTempsConstant(a: string, b: string): boolean {
  const x = encoder.encode(a)
  const y = encoder.encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

export async function creerJeton(role: Role): Promise<string> {
  const charge = b64url(encoder.encode(JSON.stringify({ role, exp: Math.floor(Date.now() / 1000) + DUREE_SESSION_S })))
  return `${charge}.${await signer(charge)}`
}

export async function verifierJeton(jeton: string | undefined): Promise<Session | null> {
  if (!authActive()) return accesBloque() ? null : { role: 'admin', exp: Infinity }
  if (!jeton) return null
  const [charge, signature] = jeton.split('.')
  if (!charge || !signature) return null
  try {
    if (!egalTempsConstant(signature, await signer(charge))) return null
    const s = JSON.parse(Buffer.from(charge, 'base64url').toString()) as Session
    return s.exp > Date.now() / 1000 ? s : null
  } catch {
    return null
  }
}

/** Rôle correspondant au mot de passe saisi, ou null. */
export function roleDuMotDePasse(saisi: string): Role | null {
  const admin = process.env.PAIE_MOT_DE_PASSE_ADMIN
  const utilisateur = process.env.PAIE_MOT_DE_PASSE
  if (admin && egalTempsConstant(saisi, admin)) return 'admin'
  if (utilisateur && egalTempsConstant(saisi, utilisateur)) return 'utilisateur'
  return null
}
