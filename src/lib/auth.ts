import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // OAuth成功時に User / Account を Prisma 経由でDBに保存する。
  // session strategy='jwt' と併用可能（Sessionテーブルは使わずJWTのみ、ただし
  // User/Account は adapter 経由で DB に作られる）。
  // これが無いと session.user.id が DB に存在しない OAuth sub になり、
  // 戦績取得 (prisma.user.findUnique) が常に null になる。
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      // 初回サインイン時のみ user オブジェクトが渡る（adapter が作成した User）
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      return session
    },
  },
})
