import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getDb } from './db'

interface DbUser { id: number; email: string; password_hash: string; role: string }

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const db = getDb()
        const user = db.prepare('SELECT * FROM users WHERE email = ?')
          .get(credentials.email.toLowerCase().trim()) as DbUser | undefined
        if (!user) return null
        const ok = await bcrypt.compare(credentials.password, user.password_hash)
        if (!ok) return null
        return { id: String(user.id), email: user.email, role: user.role }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { id: string; role: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
}

// Extend next-auth types
declare module 'next-auth' {
  interface Session {
    user: { id: string; email: string; role: string; name?: string | null; image?: string | null }
  }
}
declare module 'next-auth/jwt' {
  interface JWT { id?: string; role?: string }
}
