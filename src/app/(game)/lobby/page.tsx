import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import { RoomList } from '@/components/lobby/RoomList'
import { CreateRoomDialog } from '@/components/lobby/CreateRoomDialog'

export default async function LobbyPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400">ロビー</h1>
            <p className="text-slate-400 text-sm mt-0.5">ようこそ、{session.user.name} さん</p>
          </div>
          <CreateRoomDialog />
        </div>
        <RoomList />
      </main>
    </div>
  )
}
