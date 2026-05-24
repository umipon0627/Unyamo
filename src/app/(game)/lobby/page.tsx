import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { RoomList } from '@/components/lobby/RoomList'
import { CreateRoomDialog } from '@/components/lobby/CreateRoomDialog'
import { JoinRoomDialog } from '@/components/lobby/JoinRoomDialog'
import { getCurrentUser } from '@/lib/current-user'

export default async function LobbyPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen bg-unyam-cream">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {/* ページヘッダー */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="font-heading text-2xl font-bold text-unyam-ink">
              ロビー
            </h1>
            <p className="text-unyam-ink-muted text-sm mt-0.5">
              ようこそ、{user.name} さん
              {user.isGuest && (
                <span className="ml-2 text-unyam-gold text-xs font-medium">
                  （ゲストモード・戦績は保存されません）
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <JoinRoomDialog />
            <CreateRoomDialog />
          </div>
        </div>
        <RoomList currentUserId={user.id} />
      </main>
      <Footer />
    </div>
  )
}
