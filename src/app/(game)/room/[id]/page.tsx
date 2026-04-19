import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GameBoard } from '@/components/game/GameBoard'

interface Props {
  params: { id: string }
}

export default async function RoomPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // NextAuth JWTトークンを取得するためのシンプルなアプローチ:
  // セッションのuser.idをそのまま渡し、PartyKitサーバー側でAPIを叩いて検証
  // 本来はgetToken()でJWTを取得するが、App RouterではAPI Route経由が安全
  const token = session.user.id // 簡略実装（本番はAPI Routeで実際のJWTを取得）

  return (
    <GameBoard
      roomId={params.id}
      myPlayerId={session.user.id}
      token={token}
    />
  )
}
