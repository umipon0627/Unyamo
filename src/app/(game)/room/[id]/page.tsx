import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'

export default async function RoomPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4">
        <h1 className="text-2xl font-bold text-emerald-400 mb-4">ゲームルーム: {params.id}</h1>
        <p className="text-slate-400">Phase 3 で実装予定: ゲームボード</p>
      </main>
    </div>
  )
}
