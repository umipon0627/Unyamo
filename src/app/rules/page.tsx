import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'あそびかた | Unyamo',
  description: 'オリジナルトランプゲーム ウニャモ のルール説明',
}

const CARD_SHADOW = 'shadow-[0_6px_20px_-6px_rgba(40,30,20,0.18)]'

function MiniCard({ rank, suit }: { rank: string; suit: string }) {
  const isRed = suit === '♥' || suit === '♦'
  const color = isRed ? 'text-card-red' : 'text-card-black'
  return (
    <div className="inline-flex flex-col items-center justify-center w-11 h-16 rounded-xl bg-white border-2 border-unyamo-border shadow-sm shrink-0">
      <span className={`font-heading font-extrabold text-lg leading-none ${color}`}>{rank}</span>
      <span className={`text-base leading-none ${color}`}>{suit}</span>
    </div>
  )
}

function SectionHeading({ no, title }: { no: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="font-heading font-extrabold text-sm text-unyamo-cream bg-unyamo-green w-8 h-8 rounded-full flex items-center justify-center shrink-0">
        {no}
      </span>
      <h2 className="font-heading text-xl font-extrabold text-unyamo-ink leading-tight">{title}</h2>
    </div>
  )
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`bg-unyamo-surface rounded-3xl border-2 border-unyamo-border p-5 ${CARD_SHADOW} ${className}`}
    >
      {children}
    </section>
  )
}

export default function RulesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-unyamo-cream">
      <Header />
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-6 pb-16">
        {/* 戻る導線 */}
        <Link
          href="/play"
          className="inline-flex items-center gap-1.5 text-sm font-heading font-bold text-unyamo-ink-muted hover:text-unyamo-ink transition-colors mb-5 active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          もどる
        </Link>

        {/* ヒーロー */}
        <div className="text-center mb-7">
          <p className="font-heading font-bold text-xs tracking-[0.2em] text-unyamo-gold-deep mb-1">
            HOW TO PLAY
          </p>
          <h1 className="font-heading text-3xl font-extrabold text-unyamo-ink mb-1.5">
            あそびかた
          </h1>
          <p className="text-unyamo-ink-muted text-sm font-heading font-bold">
            30秒でわかる、ウニャモの遊びかた 🐱
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {/* ゲームの目的 */}
          <section
            className={`relative rounded-3xl border-2 border-unyamo-gold bg-unyamo-gold-soft/30 p-5 ${CARD_SHADOW}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-unyamo-gold-deep text-lg leading-none">★</span>
              <h2 className="font-heading text-lg font-extrabold text-unyamo-ink">ゲームの目的</h2>
            </div>
            <div className="flex justify-center gap-2 mb-4">
              <MiniCard rank="A" suit="♥" />
              <div className="inline-flex flex-col items-center justify-center w-11 h-16 rounded-xl bg-unyamo-navy text-white border-2 border-unyamo-navy shadow-sm shrink-0">
                <span className="font-heading font-extrabold text-[10px] leading-none">JOKER</span>
                <span className="text-lg leading-none">🃏</span>
              </div>
            </div>
            <p className="text-unyamo-ink text-sm leading-relaxed text-center">
              手札の合計点を<strong className="text-unyamo-green font-extrabold">できるだけ小さく</strong>。
              合計が<strong className="text-unyamo-gold-deep font-extrabold">5点以下</strong>になったら
              <strong className="text-unyamo-gold-deep font-extrabold">「ウニャモ！」</strong>と宣言。
              全員の中で<strong className="text-unyamo-green font-extrabold">一番点数が低い人の勝ち</strong>です。
            </p>
          </section>

          {/* 01 基本セットアップ */}
          <Panel>
            <SectionHeading no="01" title="基本セットアップ" />
            <ul className="flex flex-col gap-3">
              {[
                { icon: '🃏', label: '使うカード', main: 'トランプ1組', sub: '52枚 + ジョーカー2枚 = 54枚' },
                { icon: '👥', label: 'プレイ人数', main: '2〜5人', sub: '1人ならCPU対戦も可能' },
                { icon: '✋', label: '最初の手札', main: '3枚ずつ', sub: 'ゲーム開始時に配られます' },
              ].map((row) => (
                <li
                  key={row.label}
                  className="flex items-center gap-3 rounded-2xl bg-unyamo-cream/60 border border-unyamo-border px-4 py-3"
                >
                  <span className="text-2xl leading-none shrink-0">{row.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-heading font-bold text-unyamo-ink-muted">{row.label}</p>
                    <p className="font-heading font-extrabold text-unyamo-ink leading-tight">
                      {row.main}
                    </p>
                    <p className="text-xs text-unyamo-ink-muted">{row.sub}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          {/* 02 カードの点数 */}
          <Panel>
            <SectionHeading no="02" title="カードの点数" />
            <p className="text-xs text-unyamo-ink-muted mb-3">
              マーク（スート）は点数に関係しません。
            </p>
            <ul className="flex flex-col gap-2">
              {[
                { rank: 'A', score: '1', name: 'エース' },
                { rank: '2〜10', score: '数字そのまま', name: '', plain: true },
                { rank: 'J', score: '11', name: 'ジャック' },
                { rank: 'Q', score: '12', name: 'クイーン' },
                { rank: 'K', score: '13', name: 'キング' },
              ].map((row) => (
                <li
                  key={row.rank}
                  className="flex items-center justify-between rounded-xl bg-unyamo-cream/60 border border-unyamo-border px-4 py-2.5"
                >
                  <span className="font-heading font-extrabold text-unyamo-ink w-16">{row.rank}</span>
                  {row.plain ? (
                    <span className="font-heading font-bold text-unyamo-ink-muted text-sm flex-1 text-right">
                      {row.score}
                    </span>
                  ) : (
                    <span className="flex-1 text-right">
                      <strong className="font-heading font-extrabold text-unyamo-green text-lg">
                        {row.score}
                      </strong>
                      <span className="text-unyamo-ink-muted text-sm"> 点</span>
                      <span className="text-unyamo-ink-muted text-xs ml-2">{row.name}</span>
                    </span>
                  )}
                </li>
              ))}
              {/* JOKER */}
              <li className="flex items-center justify-between rounded-xl bg-unyamo-navy/10 border-2 border-unyamo-navy/30 px-4 py-2.5">
                <span className="font-heading font-extrabold text-unyamo-navy flex items-center gap-2">
                  JOKER
                  <span className="text-[10px] font-bold text-unyamo-gold-deep">★ SPECIAL</span>
                </span>
                <span className="text-right">
                  <strong className="font-heading font-extrabold text-unyamo-navy text-lg">0</strong>
                  <span className="text-unyamo-ink-muted text-sm"> 点</span>
                  <span className="text-unyamo-gold-deep text-xs font-bold ml-2">最強！</span>
                </span>
              </li>
            </ul>
          </Panel>

          {/* 03 自分のターン */}
          <Panel>
            <SectionHeading no="03" title="自分のターンにすること" />
            <p className="text-xs text-unyamo-ink-muted mb-4">
              毎ターン必ず操作します（パスは無し）。
            </p>
            {/* ① 引く */}
            <div className="flex gap-3 mb-3">
              <span className="font-heading font-extrabold text-unyamo-teal text-xl shrink-0 w-7 h-7 rounded-full bg-unyamo-teal/15 flex items-center justify-center">
                ①
              </span>
              <div>
                <p className="font-heading font-extrabold text-unyamo-teal">引く</p>
                <p className="text-sm text-unyamo-ink leading-relaxed">
                  山札の一番上、または捨て札の一番上から、
                  <strong className="font-bold">好きな方を1枚</strong>引く。
                </p>
              </div>
            </div>
            {/* ② 捨てる */}
            <div className="flex gap-3 mb-4">
              <span className="font-heading font-extrabold text-unyamo-red text-xl shrink-0 w-7 h-7 rounded-full bg-unyamo-red/15 flex items-center justify-center">
                ②
              </span>
              <div>
                <p className="font-heading font-extrabold text-unyamo-red">捨てる</p>
                <p className="text-sm text-unyamo-ink leading-relaxed">
                  手札から<strong className="font-bold">1枚を選んで捨てる</strong>。これで自分のターンは終了。
                </p>
              </div>
            </div>
            {/* 特殊操作 */}
            <div className="rounded-2xl bg-unyamo-gold-soft/25 border-2 border-unyamo-gold/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-heading font-extrabold text-unyamo-gold-deep text-sm">★ 特殊操作</p>
                <span className="text-[10px] font-heading font-bold text-unyamo-cream bg-unyamo-gold-deep px-2 py-0.5 rounded-full">
                  1ターン1回
                </span>
              </div>
              <p className="text-sm text-unyamo-ink font-bold mb-3">
                同じ数字を<strong className="text-unyamo-gold-deep">2〜3枚まとめて捨てる</strong>
              </p>
              <div className="flex justify-center gap-2 mb-3">
                <MiniCard rank="7" suit="♥" />
                <MiniCard rank="7" suit="♣" />
                <MiniCard rank="7" suit="♠" />
              </div>
              <p className="text-xs text-unyamo-ink-muted mb-2">
                手札を一気に減らせる強力な技。下のルールに注意：
              </p>
              <ul className="flex flex-col gap-1.5 text-sm text-unyamo-ink">
                <li className="flex gap-2">
                  <span className="text-unyamo-green shrink-0">✓</span>
                  <span>ジョーカーは同じ数字に<strong className="font-bold">添えて</strong>一緒に捨ててOK</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-unyamo-red shrink-0">!</span>
                  <span>手札は<strong className="font-bold">最低1枚は残す</strong>必要あり</span>
                </li>
              </ul>
            </div>
          </Panel>

          {/* 04 ウニャモ宣言 */}
          <Panel className="border-unyamo-gold">
            <SectionHeading no="04" title="ウニャモ宣言" />
            <p className="text-xs text-unyamo-ink-muted mb-4">
              ゲームの山場、ここで叫びます。
            </p>
            <div className="rounded-2xl bg-gradient-to-b from-unyamo-gold to-unyamo-gold-deep text-center py-4 mb-4 shadow-[0_4px_16px_-4px_rgba(201,150,52,0.5)]">
              <p className="font-heading font-bold text-[10px] tracking-[0.25em] text-unyamo-ink/70">
                DECLARE!
              </p>
              <p className="font-heading font-extrabold text-2xl text-unyamo-ink">ウニャモ！</p>
            </div>
            <ul className="flex flex-col gap-3">
              {[
                { icon: '📐', text: <>合計点が<strong className="font-bold text-unyamo-gold-deep">5点以下</strong>になったら宣言できる</> },
                { icon: '🥇', text: <>宣言は<strong className="font-bold">自分のターンの先頭</strong>（カードを引く前）</> },
                { icon: '🛑', text: <>宣言したターンは<strong className="font-bold">引きも捨てもせず</strong>そのまま終了</> },
                { icon: '🔒', text: <>1ゲームで宣言できるのは<strong className="font-bold">最初の1人だけ</strong></> },
                { icon: '🎬', text: <>宣言後、<strong className="font-bold">残りの全員が1回ずつ</strong>操作してから勝敗判定</> },
              ].map((row, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-unyamo-ink leading-relaxed">
                  <span className="text-lg leading-none shrink-0">{row.icon}</span>
                  <span>{row.text}</span>
                </li>
              ))}
            </ul>
          </Panel>

          {/* 05 勝敗 */}
          <Panel>
            <SectionHeading no="05" title="勝敗の決まりかた" />
            <p className="text-xs text-unyamo-ink-muted mb-4">
              駆け引きのキモ。読みを誤ると逆に最下位…。
            </p>

            {/* ケースA: 勝ち */}
            <div className="rounded-2xl bg-unyamo-green/8 border-2 border-unyamo-green/30 p-4 mb-3">
              <p className="font-heading font-extrabold text-unyamo-green text-sm mb-1 flex items-center gap-1.5">
                🏆 宣言者が一番低い
              </p>
              <p className="text-sm text-unyamo-ink mb-3">
                全員の中で宣言者が一番点数が低ければ →{' '}
                <strong className="font-extrabold text-unyamo-green">宣言者の勝ち！</strong>
              </p>
              <div className="flex flex-col gap-1.5">
                <ScoreRow name="YOU" score="3" tag="👑 LOW" you winner />
                <ScoreRow name="Riku" score="7" />
                <ScoreRow name="Yuki" score="12" />
              </div>
            </div>

            {/* ケースB: 最下位 */}
            <div className="rounded-2xl bg-unyamo-red/8 border-2 border-unyamo-red/30 p-4 mb-3">
              <p className="font-heading font-extrabold text-unyamo-red text-sm mb-1 flex items-center gap-1.5">
                💢 同点 or それ以下がいる
              </p>
              <p className="text-sm text-unyamo-ink mb-3">
                宣言者と<strong className="font-bold">同点 or それより低い人</strong>が1人でもいたら →{' '}
                <strong className="font-extrabold text-unyamo-red">宣言者は最下位…！</strong>
              </p>
              <div className="flex flex-col gap-1.5">
                <ScoreRow name="YOU" score="5" tag="宣言者" you loser />
                <ScoreRow name="Riku" score="4" tag="👑 LOW" winner />
                <ScoreRow name="Yuki" score="8" />
              </div>
            </div>

            {/* コツ */}
            <div className="rounded-2xl bg-unyamo-cream/60 border border-unyamo-border p-4">
              <p className="text-sm text-unyamo-ink leading-relaxed">
                <span className="mr-1">💡</span>
                <strong className="font-extrabold text-unyamo-gold-deep">同点でも宣言者の負け</strong>。
                「早すぎる宣言・甘い読み」はハイリスクなので、相手の手札枚数から点数を読み切るのがコツ。
              </p>
            </div>
          </Panel>

          {/* 06 ゲームの流れ */}
          <Panel>
            <SectionHeading no="06" title="ゲームの流れ" />
            <ol className="flex flex-col gap-2">
              {[
                { icon: '🚪', label: 'ルーム待機', no: '01' },
                { icon: '🎴', label: '配札（3枚ずつ）', no: '02' },
                { icon: '🔄', label: '順番にターン', no: '03' },
                { icon: '⭐', label: 'ウニャモ宣言', no: '04' },
                { icon: '⏳', label: '残り全員が1巡', no: '05' },
                { icon: '🏆', label: '結果発表', no: '06' },
              ].map((step) => (
                <li
                  key={step.no}
                  className="flex items-center gap-3 rounded-2xl bg-unyamo-cream/60 border border-unyamo-border px-4 py-3"
                >
                  <span className="text-xl leading-none shrink-0">{step.icon}</span>
                  <span className="font-heading font-bold text-unyamo-ink flex-1">{step.label}</span>
                  <span className="font-heading font-extrabold text-xs text-unyamo-ink-muted">
                    {step.no}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          {/* CTA */}
          <div className="text-center pt-2">
            <p className="font-heading font-extrabold text-unyamo-ink mb-3">これで準備OK！</p>
            <Link
              href="/play"
              className="inline-flex items-center justify-center w-full bg-unyamo-green text-unyamo-cream font-heading font-extrabold text-lg rounded-full py-3.5 shadow-[0_6px_20px_-6px_rgba(30,107,77,0.5)] hover:scale-[1.02] active:scale-95 transition-transform"
            >
              さっそく遊ぶ
            </Link>
            <Link
              href="/play"
              className="inline-block mt-3 text-sm font-heading font-bold text-unyamo-ink-muted hover:text-unyamo-ink transition-colors"
            >
              モード選択に戻る
            </Link>
            <p className="text-unyamo-ink-muted/70 text-sm mt-5">🐾 Have fun!</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function ScoreRow({
  name,
  score,
  tag,
  you = false,
  winner = false,
  loser = false,
}: {
  name: string
  score: string
  tag?: string
  you?: boolean
  winner?: boolean
  loser?: boolean
}) {
  const scoreColor = winner ? 'text-unyamo-green' : loser ? 'text-unyamo-red' : 'text-unyamo-ink'
  return (
    <div className="flex items-center gap-2 rounded-xl bg-unyamo-surface border border-unyamo-border px-3 py-2">
      <span
        className={`font-heading font-extrabold text-xs w-12 shrink-0 ${
          you ? 'text-unyamo-ink' : 'text-unyamo-ink-muted'
        }`}
      >
        {name}
      </span>
      <span className="flex-1 text-sm">
        <strong className={`font-heading font-extrabold ${scoreColor}`}>{score}</strong>
        <span className="text-unyamo-ink-muted text-xs"> 点</span>
      </span>
      {tag && (
        <span
          className={`text-[10px] font-heading font-bold px-2 py-0.5 rounded-full shrink-0 ${
            winner
              ? 'bg-unyamo-gold-soft text-unyamo-gold-deep'
              : loser
                ? 'bg-unyamo-red/15 text-unyamo-red'
                : 'bg-unyamo-cream text-unyamo-ink-muted'
          }`}
        >
          {tag}
        </span>
      )}
    </div>
  )
}
