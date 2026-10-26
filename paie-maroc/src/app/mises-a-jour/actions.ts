'use server'

import { redirect } from 'next/navigation'
import { exigerSession } from '@/lib/auth'
import { infosVersion, installerRelease } from '@/lib/version'

export async function installerVersion(tag: string) {
  await exigerSession('admin')
  if (infosVersion().environnement !== 'production' && process.env.PAIE_AUTORISER_MAJ !== '1') {
    throw new Error('Les mises à jour s\'installent depuis la version de production.')
  }
  const r = await installerRelease(tag)
  redirect(`/mises-a-jour?installation=${encodeURIComponent(r.tag)}&commit=${r.commit}`)
}
