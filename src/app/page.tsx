import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default async function LandingPage() {
  const session = await auth()
  if (session) redirect('/lobby')

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl font-bold text-emerald-400 mb-4">Unyamo</h1>
        <p className="text-slate-300 mb-2 max-w-md">
          オリジナルトランプゲーム「ウニャモ」のオンライン対戦アプリ。
        </p>
        <p className="text-slate-400 text-sm mb-8 max-w-md">
          3〜8人で遊べる手札点数最小化ゲーム。手札合計5点以下でウニャモ宣言！
        </p>
        <Link href="/login">
          <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600">
            ログインして遊ぶ
          </Button>
        </Link>
      </main>
      <Footer />
    </div>
  )
}
