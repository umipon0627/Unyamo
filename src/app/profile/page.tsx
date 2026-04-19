import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto w-full px-4 py-6">
        <h1 className="text-2xl font-bold text-emerald-400 mb-6">プロフィール</h1>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={session.user.image ?? ''} />
                <AvatarFallback className="text-xl bg-slate-700">
                  {session.user.name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-slate-100">{session.user.name}</CardTitle>
                <p className="text-slate-400 text-sm">{session.user.email}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500 text-sm">戦績は Phase 5 で実装予定</p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
