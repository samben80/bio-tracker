import { sessionCourante } from '@/lib/auth'
import { infosVersion } from '@/lib/version'

export async function GET() {
  if (!(await sessionCourante())) return new Response('Non authentifié', { status: 401 })
  const v = infosVersion()
  return Response.json({ version: v.version, commit: v.commit, environnement: v.environnement }, { headers: { 'Cache-Control': 'no-store' } })
}
