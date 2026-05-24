import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { getCurrentUser } from '@/lib/current-user'

export default async function LandingPage() {
  const user = await getCurrentUser()
  if (user) redirect('/play')

  return (
    <div className="flex flex-col min-h-screen bg-unyam-cream">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        {/* トランプイラスト装飾 */}
        <div className="relative mb-8 flex items-center justify-center">
          {/* 奥のカード（左傾き） */}
          <div
            className="absolute w-16 h-22 rounded-xl bg-unyam-surface border-2 border-unyam-border shadow-[0_4px_16px_-4px_rgba(40,30,20,0.18)] -rotate-12 -translate-x-10 translate-y-1"
            aria-hidden="true"
          />
          {/* 奥のカード（右傾き） */}
          <div
            className="absolute w-16 h-22 rounded-xl bg-unyam-surface border-2 border-unyam-border shadow-[0_4px_16px_-4px_rgba(40,30,20,0.18)] rotate-12 translate-x-10 translate-y-1"
            aria-hidden="true"
          />
          {/* 手前の中央カード */}
          <div className="relative w-16 h-22 rounded-xl bg-unyam-surface border-2 border-unyam-border shadow-[0_8px_24px_-6px_rgba(40,30,20,0.22)] flex items-center justify-center z-10">
            <span className="text-3xl" aria-hidden="true">🃏</span>
          </div>
        </div>

        {/* メインコピー */}
        <p className="font-heading text-sm font-bold text-unyam-ink-muted tracking-widest uppercase mb-2">
          CARD GAME
        </p>
        <h1 className="font-heading text-6xl font-extrabold text-unyam-ink mb-4 leading-none">
          Unyam
        </h1>
        <p className="text-unyam-ink-muted text-base mb-2 max-w-xs leading-relaxed">
          手札の合計点を最小化して<br />
          「ウニャム！」を宣言しよう。
        </p>
        <p className="text-unyam-ink-muted/70 text-sm mb-10 max-w-xs">
          2〜5人で遊べる、オリジナルトランプゲーム。
        </p>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
          <Link href="/login" className="w-full">
            <Button
              size="lg"
              className="w-full bg-unyam-green text-unyam-cream font-heading font-bold text-lg shadow-[0_6px_20px_-4px_rgba(30,107,77,0.40)] hover:shadow-[0_8px_24px_-4px_rgba(30,107,77,0.50)] hover:scale-[1.03] active:scale-95 transition-all"
            >
              はじめる
            </Button>
          </Link>
          <Link
            href="/rules"
            className="font-heading font-bold text-unyam-ink-muted hover:text-unyam-ink text-sm underline underline-offset-4 decoration-unyam-border hover:decoration-unyam-ink-muted transition-colors"
          >
            ルールを見る
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
