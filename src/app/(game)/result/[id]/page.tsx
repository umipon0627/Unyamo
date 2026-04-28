import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ゲーム結果はPartyKitのインメモリのみ（DBに保存しない設計）
// 実際の結果はWebSocket経由でGameBoardが持っている
// このページはゲーム後のサマリー兼シェアページとして機能

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-emerald-400">ゲーム終了</h1>
          <p className="text-slate-400 text-sm mt-1">ルームID: {id}</p>
        </div>
        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardHeader>
            <CardTitle className="text-slate-300 text-base">結果について</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 text-sm">
              ゲームの詳細な結果はゲーム画面内の結果モーダルでご確認いただけます。
              ゲーム状態はリアルタイムのみで管理されているため、このページには保存されません。
            </p>
          </CardContent>
        </Card>
        <div className="flex gap-3 justify-center">
          <Link href="/lobby">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              ロビーへ戻る
            </Button>
          </Link>
          <Link href={`/room/${id}`}>
            <Button variant="outline" className="border-slate-600">
              同じルームで再戦
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
