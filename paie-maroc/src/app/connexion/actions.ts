'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_SESSION, creerJeton, DUREE_SESSION_S, roleDuMotDePasse } from '@/lib/session'

export async function seConnecter(_etat: string | null, fd: FormData): Promise<string | null> {
  const role = roleDuMotDePasse(String(fd.get('motDePasse') ?? ''))
  if (!role) {
    await new Promise((r) => setTimeout(r, 800)) // ralentit les essais par force brute
    return 'Mot de passe incorrect.'
  }
  ;(await cookies()).set(COOKIE_SESSION, await creerJeton(role), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DUREE_SESSION_S,
  })
  const suite = String(fd.get('suite') ?? '/')
  redirect(suite.startsWith('/') && !suite.startsWith('//') ? suite : '/')
}

export async function seDeconnecter() {
  ;(await cookies()).delete(COOKIE_SESSION)
  redirect('/connexion')
}
