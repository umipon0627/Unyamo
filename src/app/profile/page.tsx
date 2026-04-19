import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

async function fetchStats() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/users/me/stats`, {
      headers: { Cookie: '' }, // サーバーサイドでは認証クッキーなし
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.stats
  } catch {
    return null
  }
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto w-full px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold text-emerald-400">プロフィール</h1>

        {/* ユーザー情報 */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={session.user.image ?? ''} />
                <AvatarFallback className="text-xl bg-slate-700">
                  {session.user.name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-bold text-slate-100">{session.user.name}</p>
                <p className="text-slate-400 text-sm">{session.user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 戦績カード */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-300 text-base">戦績</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500 text-sm">
              ゲームに参加すると戦績が記録されます。
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
