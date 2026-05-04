import { SignJWT } from 'jose'

/**
 * PartyKit WebSocket 接続時の認証用に短命 JWT を発行する。
 * - 署名鍵は AUTH_SECRET（NextAuth v5 デフォルト）または NEXTAUTH_SECRET を使用。
 * - PartyKit 側 (party/auth.ts) の verifyToken と同じ秘密鍵を共有する必要がある。
 * - 有効期限は 5 分（接続確立直後に JOIN メッセージで送るだけなので十分）。
 */
export async function issuePartyToken(params: {
  userId: string
  name: string
}): Promise<string> {
  const raw = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''
  if (!raw) {
    throw new Error('AUTH_SECRET (or NEXTAUTH_SECRET) is not configured')
  }
  const secret = new TextEncoder().encode(raw)
  return await new SignJWT({ id: params.userId, name: params.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret)
}
