import { redirect } from 'next/navigation'
import { GameBoard } from '@/components/game/GameBoard'
import { issuePartyToken } from '@/lib/party-token'
import { getCurrentUser } from '@/lib/current-user'

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // PartyKit 認証用の短命 JWT を発行（5分）。
  // PartyKit サーバー側 (party/auth.ts) の verifyToken と同じ AUTH_SECRET で署名・検証する。
  const token = await issuePartyToken({
    userId: user.id,
    name: user.name,
  })

  return (
    <GameBoard
      roomId={id}
      myPlayerId={user.id}
      token={token}
    />
  )
}
