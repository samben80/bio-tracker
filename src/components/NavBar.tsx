'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState } from 'react'

export default function NavBar() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="font-bold text-gray-900">BioTracker</span>
        </Link>

        <div className="flex items-center gap-2">
          {session?.user ? (
            <div className="relative">
              <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white
                  ${session.user.role === 'admin' ? 'bg-red-500' : 'bg-indigo-500'}`}>
                  {session.user.email?.[0].toUpperCase()}
                </div>
                <span className="text-sm text-gray-700 hidden sm:block max-w-[140px] truncate">
                  {session.user.email}
                </span>
                {session.user.role === 'admin' && (
                  <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium hidden sm:block">Admin</span>
                )}
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {open && (
                <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20"
                  onMouseLeave={() => setOpen(false)}>
                  <Link href="/" onClick={() => setOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Mes analyses
                  </Link>
                  {session.user.role === 'admin' && (
                    <Link href="/admin" onClick={() => setOpen(false)}
                      className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium">
                      Panel Admin
                    </Link>
                  )}
                  <hr className="my-1 border-gray-100" />
                  <button onClick={() => { setOpen(false); signOut({ callbackUrl: '/' }) }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50">
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/signin"
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                Connexion
              </Link>
              <Link href="/auth/register"
                className="text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl transition-colors">
                S&apos;inscrire
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
