import { NextResponse } from 'next/server'
import { issuePartyToken } from '@/lib/party-token'
import { getCurrentUser } from '@/lib/current-user'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/token
 * PartyKit WebSocket 接続用の短命 JWT を発行する。
 * NextAuth セッション or ゲスト cookie のどちらでもOK。
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const token = await issuePartyToken({
      userId: user.id,
      name: user.name,
    })
    return NextResponse.json({ token })
  } catch {
    return NextResponse.json(
      { error: 'Failed to issue token' },
      { status: 500 }
    )
  }
}
