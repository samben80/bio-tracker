import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_SESSION, verifierJeton } from './lib/session'

// Contrôle d'accès « optimiste » : redirige vers la connexion sans session valide.
// Chaque Server Action et route API revérifie la session côté serveur.
export async function proxy(req: NextRequest) {
  const session = await verifierJeton(req.cookies.get(COOKIE_SESSION)?.value)
  if (session) return NextResponse.next()
  if (req.nextUrl.pathname.startsWith('/api/')) return new NextResponse('Non authentifié', { status: 401 })
  const url = new URL('/connexion', req.url)
  if (req.nextUrl.pathname !== '/') url.searchParams.set('suite', req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!connexion|_next/static|_next/image|favicon.ico).*)'],
}
