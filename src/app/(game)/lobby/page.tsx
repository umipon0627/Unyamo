import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'

export default async function LobbyPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4">
        <h1 className="text-2xl font-bold text-emerald-400 mb-4">ロビー</h1>
        <p className="text-slate-400">Phase 4 で実装予定: ルーム一覧・作成</p>
        <p className="text-slate-500 text-sm mt-2">ログイン中: {session.user.name}</p>
      </main>
    </div>
  )
}
