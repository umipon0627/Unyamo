import { redirect } from 'next/navigation'
import { GameBoard } from '@/components/game/GameBoard'
import { issuePartyToken } from '@/lib/party-token'
import { getCurrentUser } from '@/lib/current-user'
import { getRoom } from '@/lib/room-store'

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

  // ロビー作成ルームの表示名（PartyKit サーバーは DB のルーム名を知らず
  // roomConfig.roomName に UUID を入れてしまうため、ここで実名を渡す）。
  const roomName = getRoom(id)?.name

  return (
    <GameBoard
      roomId={id}
      myPlayerId={user.id}
      token={token}
      roomName={roomName}
    />
  )
}
