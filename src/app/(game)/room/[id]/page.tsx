import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GameBoard } from '@/components/game/GameBoard'

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const token = session.user.id

  return (
    <GameBoard
      roomId={id}
      myPlayerId={session.user.id}
      token={token}
    />
  )
}
