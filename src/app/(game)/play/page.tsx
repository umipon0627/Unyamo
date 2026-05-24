import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bot, Users, BookOpen } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Badge } from '@/components/ui/badge'
import { getCurrentUser } from '@/lib/current-user'

export default async function PlayPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen bg-unyam-cream">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-start px-4 pt-10 pb-16">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-extrabold text-unyam-ink mb-1">
            あそびかたを選ぼう
          </h1>
          <p className="text-unyam-ink-muted text-sm font-heading font-bold">
            ようこそ、{user.name} さん
            {user.isGuest && (
              <span className="ml-2 text-unyam-gold-deep text-xs">（ゲストモード）</span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 w-full max-w-sm">
          {/* オンライン対戦 */}
          <Link href="/lobby" className="group block">
            <div className="relative bg-unyam-green rounded-3xl border-2 border-unyam-green/80 shadow-[0_8px_28px_-6px_rgba(30,107,77,0.40)] p-6 hover:shadow-[0_12px_36px_-6px_rgba(30,107,77,0.50)] hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer">
              {/* おすすめバッジ */}
              <div className="absolute top-4 right-4">
                <Badge className="bg-unyam-gold text-unyam-ink font-heading font-bold text-xs px-3">
                  おすすめ
                </Badge>
              </div>

              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-extrabold text-white leading-tight">
                    オンライン対戦
                  </h2>
                  <p className="text-white/70 text-xs font-heading font-bold mt-0.5">
                    最大5人でマルチプレイ
                  </p>
                </div>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                ルームを作成して友達を招待。<br />
                最大5人でリアルタイム対戦！
              </p>
              <div className="mt-4 flex justify-end">
                <span className="font-heading font-bold text-white/90 text-sm">
                  あそぶ →
                </span>
              </div>
            </div>
          </Link>

          {/* CPU対戦 */}
          <Link href="/play/cpu" className="group block">
            <div className="relative bg-unyam-surface rounded-3xl border-2 border-unyam-navy/30 shadow-[0_8px_28px_-6px_rgba(42,66,99,0.20)] p-6 hover:shadow-[0_12px_36px_-6px_rgba(42,66,99,0.30)] hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 rounded-2xl bg-unyam-navy/10 flex items-center justify-center shrink-0">
                  <Bot className="w-7 h-7 text-unyam-navy" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-extrabold text-unyam-ink leading-tight">
                    CPU対戦
                  </h2>
                  <p className="text-unyam-ink-muted text-xs font-heading font-bold mt-0.5">
                    1人でも楽しめる
                  </p>
                </div>
              </div>
              <p className="text-unyam-ink-muted text-sm leading-relaxed">
                すぐ遊べる！1〜3体のCPUと<br />
                1人で対戦練習。
              </p>
              <div className="mt-4 flex justify-end">
                <span className="font-heading font-bold text-unyam-navy text-sm">
                  あそぶ →
                </span>
              </div>
            </div>
          </Link>

          {/* ルールおさらい */}
          <Link href="/rules" className="block">
            <div className="flex items-center gap-3 rounded-2xl border-2 border-unyam-border bg-unyam-surface/60 px-5 py-3 hover:bg-unyam-surface hover:border-unyam-ink-muted/40 active:scale-95 transition-all duration-150 cursor-pointer">
              <BookOpen className="w-5 h-5 text-unyam-ink-muted shrink-0" />
              <span className="font-heading font-bold text-unyam-ink-muted text-sm">
                ルールをおさらいする
              </span>
            </div>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
