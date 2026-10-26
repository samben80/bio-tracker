import 'server-only'
import { cookies } from 'next/headers'
import { COOKIE_SESSION, verifierJeton, type Role, type Session } from './session'

export async function sessionCourante(): Promise<Session | null> {
  return verifierJeton((await cookies()).get(COOKIE_SESSION)?.value)
}

/** À appeler au début de chaque Server Action et route API (le proxy ne suffit pas). */
export async function exigerSession(role: Role = 'utilisateur'): Promise<Session> {
  const s = await sessionCourante()
  if (!s) throw new Error('Session expirée : reconnectez-vous.')
  if (role === 'admin' && s.role !== 'admin') throw new Error('Action réservée à l\'administrateur.')
  return s
}
