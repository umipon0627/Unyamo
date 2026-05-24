import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { getCurrentUser } from '@/lib/current-user'

// ゲーム結果はPartyKitインメモリのみ（DBに保存しない設計）。
// 実際の順位・得点はゲーム画面内の結果モーダルで表示される。
// このページはゲーム後のサマリー兼シェアの導線として機能する。

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen bg-unyam-cream">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* ページヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl font-bold text-unyam-ink">
              リザルト
            </h1>
            <p className="text-sm font-heading text-unyam-ink-muted mt-0.5">
              GAME #{id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <Link href="/play">
            <Button
              variant="outline"
              size="sm"
              className="border-2 border-unyam-border bg-unyam-surface text-unyam-ink-muted font-heading font-bold rounded-full hover:bg-unyam-cream transition-colors"
            >
              ← 戻る
            </Button>
          </Link>
        </div>

        {/* サマリーエリア */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full border-4 border-unyam-gold bg-unyam-gold-soft flex items-center justify-center shadow-[0_8px_32px_-8px_rgba(201,150,52,0.5)]">
              <span className="text-4xl">🐱</span>
            </div>
          </div>
          <p className="font-heading text-2xl font-extrabold text-unyam-ink mb-2">
            ゲーム終了
          </p>
          <p className="font-heading text-sm text-unyam-ink-muted">
            おつかれさまでした！
          </p>
        </div>

        {/* 説明カード */}
        <div className="bg-unyam-surface border-2 border-unyam-border rounded-3xl p-6 mb-8 shadow-[0_6px_20px_-6px_rgba(40,30,20,0.12)]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-unyam-gold-soft flex items-center justify-center flex-shrink-0">
              <span className="text-xl">📋</span>
            </div>
            <div>
              <p className="font-heading font-bold text-unyam-ink mb-1">
                結果について
              </p>
              <p className="text-sm text-unyam-ink-muted leading-relaxed">
                順位・得点・手札数などの詳細は、ゲーム終了時に表示される結果モーダルでご確認いただけます。
                ゲーム状態はリアルタイムのみで管理されているため、このページには保存されません。
              </p>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-3 justify-center">
          <Link href={`/room/${id}`}>
            <Button
              className="bg-unyam-green hover:bg-unyam-green/90 text-unyam-cream font-heading font-bold rounded-full px-8 shadow-[0_4px_12px_-4px_rgba(30,107,77,0.4)] transition-all hover:scale-105 active:scale-95"
            >
              もう一度遊ぶ
            </Button>
          </Link>
          <Link href="/play">
            <Button
              variant="outline"
              className="border-2 border-unyam-border bg-unyam-surface text-unyam-ink font-heading font-bold rounded-full px-8 hover:bg-unyam-cream transition-all hover:scale-105 active:scale-95"
            >
              退室
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
