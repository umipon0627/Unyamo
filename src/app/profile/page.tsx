import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4">
        <h1 className="text-2xl font-bold text-emerald-400 mb-4">プロフィール</h1>
        <p className="text-slate-500 text-sm">ログイン中: {session.user.name} ({session.user.email})</p>
        <p className="text-slate-400 mt-2">Phase 5 で実装予定: 戦績表示</p>
      </main>
    </div>
  )
}
