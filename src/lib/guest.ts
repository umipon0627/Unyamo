import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { GUEST_COOKIE_NAME, GUEST_COOKIE_MAX_AGE_SECONDS } from './guest-cookie'

/**
 * ゲストセッション
 * - NextAuthとは別系統。ログインなしのプレイ用に発行する署名済みJWTをcookieへ格納する
 * - DBには書き込まない（戦績保存対象外）
 * - guestId は `guest:` prefix を付け、NextAuth ユーザーIDと衝突しないようにする
 */

export { GUEST_COOKIE_NAME }

export interface GuestIdentity {
  userId: string // 例: "guest:abcd1234"
  name: string   // 例: "ゲスト_AB12"
}

function getSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''
  if (!raw) {
    throw new Error('AUTH_SECRET (or NEXTAUTH_SECRET) is not configured')
  }
  return new TextEncoder().encode(raw)
}

/**
 * 4文字の英数字（衝突を完全に避けるためサーバー側で発行）。
 */
function generateGuestSuffix(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 紛らわしい文字を除外
  const arr = new Uint8Array(4)
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(arr)
  } else {
    for (let i = 0; i < 4; i++) arr[i] = Math.floor(Math.random() * 256)
  }
  let out = ''
  for (let i = 0; i < 4; i++) {
    const v = arr[i] ?? 0
    out += chars[v % chars.length]
  }
  return out
}

function generateGuestId(): string {
  // 衝突確率を更に下げるため8文字のid本体を別途生成
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const arr = new Uint8Array(12)
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(arr)
  } else {
    for (let i = 0; i < 12; i++) arr[i] = Math.floor(Math.random() * 256)
  }
  let out = ''
  for (let i = 0; i < 12; i++) {
    const v = arr[i] ?? 0
    out += chars[v % chars.length]
  }
  return out
}

/**
 * 新しいゲストアイデンティティを生成して署名済みJWTにする。
 * cookieに格納する文字列を返す。
 */
export async function issueGuestSession(): Promise<{
  token: string
  identity: GuestIdentity
  maxAgeSeconds: number
}> {
  const suffix = generateGuestSuffix()
  const id = generateGuestId()
  const identity: GuestIdentity = {
    userId: `guest:${id}`,
    name: `ゲスト_${suffix}`,
  }
  const token = await new SignJWT({
    id: identity.userId,
    name: identity.name,
    role: 'guest',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${GUEST_COOKIE_MAX_AGE_SECONDS}s`)
    .sign(getSecret())
  return { token, identity, maxAgeSeconds: GUEST_COOKIE_MAX_AGE_SECONDS }
}

/**
 * cookie に入っているゲストJWTを検証して identity を返す。
 * 失敗時は null。
 */
export async function verifyGuestToken(token: string): Promise<GuestIdentity | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const userId = payload['id'] as string | undefined
    const name = payload['name'] as string | undefined
    const role = payload['role'] as string | undefined
    if (!userId || !name || role !== 'guest') return null
    if (!userId.startsWith('guest:')) return null
    return { userId, name }
  } catch {
    return null
  }
}

/**
 * Next.js Server Component / Route Handler 内でゲストセッションを取得する。
 * cookies() は Next 15+ で Promise になる。
 */
export async function getGuestFromCookies(): Promise<GuestIdentity | null> {
  const store = await cookies()
  const token = store.get(GUEST_COOKIE_NAME)?.value
  if (!token) return null
  return await verifyGuestToken(token)
}

/**
 * NextRequest からゲストセッションを取得する（middleware など）。
 */
export async function getGuestFromRequest(req: NextRequest): Promise<GuestIdentity | null> {
  const token = req.cookies.get(GUEST_COOKIE_NAME)?.value
  if (!token) return null
  return await verifyGuestToken(token)
}

export function isGuestUserId(userId: string | undefined | null): boolean {
  return !!userId && userId.startsWith('guest:')
}
