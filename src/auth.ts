import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from '@/shared/libs/prisma'

const THIRTY_DAYS = 30 * 24 * 60 * 60
const ONE_DAY = 24 * 60 * 60

/**
 * Auth.js (NextAuth v5) 설정
 * - JWT 세션 전략, 유효기간·갱신 주기, jwt/session 콜백
 * - Google: 내장 `Google` provider는 `AUTH_GOOGLE_ID`만 자동 주입하므로, 이 프로젝트의
 *   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`(Gmail API 등과 공유)을 명시한다.
 * - `AUTH_SECRET` — 세션 암호화
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = String(credentials.email)
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, passwordHash: true },
        })
        if (!user?.passwordHash) return null
        const ok = await compare(String(credentials.password), user.passwordHash)
        if (!ok) return null
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: THIRTY_DAYS,
    updateAge: ONE_DAY,
  },
  pages: {
    signIn: '/',
  },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.sub = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId ?? token.sub) as string
      }
      return session
    },
  },
})
