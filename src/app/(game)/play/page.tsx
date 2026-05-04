import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bot, Users } from 'lucide-react'
import Header from '@/components/layout/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/current-user'

export default async function PlayPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen bg-slate-900">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-emerald-400">対戦モード選択</h1>
          <p className="text-slate-400 text-sm mt-2">
            ようこそ、{user.name} さん
            {user.isGuest && (
              <span className="ml-2 text-amber-400 text-xs">（ゲストモード・戦績は保存されません）</span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* CPUと対戦 */}
          <Link href="/play/cpu" className="group">
            <Card className="bg-slate-800 border-slate-700 hover:border-emerald-500 transition-colors cursor-pointer h-full">
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-900/50 flex items-center justify-center group-hover:bg-emerald-800/60 transition-colors">
                    <Bot className="w-8 h-8 text-emerald-400" />
                  </div>
                </div>
                <CardTitle className="text-slate-100 text-xl">CPUと対戦する</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-400 text-center text-sm leading-relaxed">
                  すぐ遊べる！1〜3体のCPUと1人で対戦
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          {/* 友達と対戦 */}
          <Link href="/lobby" className="group">
            <Card className="bg-slate-800 border-slate-700 hover:border-amber-500 transition-colors cursor-pointer h-full">
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className="w-16 h-16 rounded-full bg-amber-900/50 flex items-center justify-center group-hover:bg-amber-800/60 transition-colors">
                    <Users className="w-8 h-8 text-amber-400" />
                  </div>
                </div>
                <CardTitle className="text-slate-100 text-xl">友達と対戦する</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-400 text-center text-sm leading-relaxed">
                  ルームを作成して友達を招待、最大8人で対戦
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  )
}
