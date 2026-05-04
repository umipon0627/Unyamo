export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { GUEST_COOKIE_NAME, issueGuestSession, verifyGuestToken } from '@/lib/guest'

/**
 * POST /api/auth/guest
 * 既存のゲスト cookie が有効ならそれを返し、無ければ新しく発行する。
 * クライアントは login ページの「ゲストとして参加」ボタンから呼び出す。
 */
export async function POST() {
  const store = await cookies()
  const existing = store.get(GUEST_COOKIE_NAME)?.value
  if (existing) {
    const identity = await verifyGuestToken(existing)
    if (identity) {
      return NextResponse.json({
        user: { id: identity.userId, name: identity.name, isGuest: true },
        reused: true,
      })
    }
  }

  try {
    const { token, identity, maxAgeSeconds } = await issueGuestSession()
    store.set({
      name: GUEST_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: maxAgeSeconds,
    })
    return NextResponse.json({
      user: { id: identity.userId, name: identity.name, isGuest: true },
      reused: false,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create guest session' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/guest
 * 現在のゲストセッションを返す（無ければ null）。
 */
export async function GET() {
  const store = await cookies()
  const token = store.get(GUEST_COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ user: null })
  const identity = await verifyGuestToken(token)
  if (!identity) return NextResponse.json({ user: null })
  return NextResponse.json({
    user: { id: identity.userId, name: identity.name, isGuest: true },
  })
}

/**
 * DELETE /api/auth/guest
 * ゲストセッションをクリアする（ログアウト相当）。
 */
export async function DELETE() {
  const store = await cookies()
  store.delete(GUEST_COOKIE_NAME)
  return NextResponse.json({ ok: true })
}
