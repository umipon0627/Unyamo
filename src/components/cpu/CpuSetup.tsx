'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Header from '@/components/layout/Header'

type Difficulty = 'EASY' | 'HARD'

export function CpuSetup() {
  const router = useRouter()
  const [cpuCount, setCpuCount] = useState(1)
  const [difficulty, setDifficulty] = useState<Difficulty>('HARD')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStart() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cpu-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpuCount, difficulty }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error ?? 'ゲームの作成に失敗しました')
        return
      }
      const data = await res.json() as { roomId: string }
      sessionStorage.setItem(
        `cpu-config-${data.roomId}`,
        JSON.stringify({ cpuCount, difficulty })
      )
      router.push(`/room/${data.roomId}`)
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // CPU対戦相手プレビュー
  const cpuNames = ['NyaBot α', 'NyaBot β', 'NyaBot γ', 'NyaBot δ']

  return (
    <div className="flex flex-col min-h-screen bg-unyam-cream">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-start px-4 pt-8 pb-40">
        <div className="w-full max-w-sm">
          {/* ページヘッダー */}
          <div className="flex items-center gap-3 mb-7">
            <div className="w-12 h-12 rounded-2xl bg-unyam-navy/10 flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6 text-unyam-navy" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-extrabold text-unyam-ink">CPU 対戦</h1>
              <p className="text-unyam-ink-muted text-sm font-heading font-bold">対戦設定を選んでください</p>
            </div>
          </div>

          <div className="bg-unyam-surface rounded-3xl border-2 border-unyam-border shadow-[0_8px_28px_-6px_rgba(40,30,20,0.14)] p-6 space-y-6">
            {/* CPU人数 */}
            <div>
              <label className="block font-heading text-sm font-bold text-unyam-ink mb-3">
                人数
                <span className="ml-2 text-xs font-bold text-unyam-ink-muted">（CPUの数を選んでください）</span>
              </label>
              <div className="flex gap-2">
                {([1, 2, 3, 4] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setCpuCount(count)}
                    className={`flex-1 py-3 rounded-full border-2 font-heading text-sm font-bold transition-all active:scale-90 ${
                      cpuCount === count
                        ? 'bg-unyam-ink text-unyam-cream border-unyam-ink shadow-[0_3px_10px_-3px_rgba(40,30,20,0.35)]'
                        : 'bg-unyam-surface border-unyam-border text-unyam-ink-muted hover:border-unyam-ink-muted hover:text-unyam-ink'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* 難易度 */}
            <div>
              <label className="block font-heading text-sm font-bold text-unyam-ink mb-3">
                難易度
              </label>
              <div className="flex gap-2">
                {(
                  [
                    { value: 'EASY', label: 'EASY', desc: 'ランダム行動' },
                    { value: 'HARD', label: 'HARD', desc: '最適行動' },
                  ] as { value: Difficulty; label: string; desc: string }[]
                ).map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDifficulty(value)}
                    className={`flex-1 py-3 px-3 rounded-full border-2 font-heading text-sm font-bold transition-all active:scale-90 ${
                      difficulty === value
                        ? 'bg-unyam-green text-unyam-cream border-unyam-green shadow-[0_3px_10px_-3px_rgba(30,107,77,0.40)]'
                        : 'bg-unyam-surface border-unyam-border text-unyam-ink-muted hover:border-unyam-ink-muted hover:text-unyam-ink'
                    }`}
                  >
                    <div>{label}</div>
                    <div className="text-xs font-bold opacity-70 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 対戦相手プレビュー */}
            <div>
              <label className="block font-heading text-sm font-bold text-unyam-ink mb-3">
                対戦相手プレビュー
              </label>
              <div className="space-y-2">
                {cpuNames.slice(0, cpuCount).map((name, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-unyam-cream rounded-2xl px-4 py-2.5 border border-unyam-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-unyam-navy/10 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-unyam-navy" />
                      </div>
                      <span className="font-heading font-bold text-sm text-unyam-ink">{name}</span>
                    </div>
                    <span className={`font-heading font-bold text-xs px-2.5 py-1 rounded-full ${
                      difficulty === 'HARD'
                        ? 'bg-unyam-red/10 text-unyam-red'
                        : 'bg-unyam-green/10 text-unyam-green'
                    }`}>
                      {difficulty}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* エラー表示 */}
            {error && (
              <p className="text-unyam-red text-sm font-heading font-bold bg-unyam-red/10 border border-unyam-red/20 rounded-xl px-3 py-2 text-center">
                {error}
              </p>
            )}
          </div>
        </div>
      </main>

      {/* 固定フッターボタン */}
      <div className="fixed bottom-0 inset-x-0 px-4 pb-6 pt-3 bg-gradient-to-t from-unyam-cream via-unyam-cream/95 to-transparent">
        <div className="max-w-sm mx-auto flex flex-col gap-2">
          <Button
            onClick={handleStart}
            disabled={loading}
            size="lg"
            className="w-full bg-unyam-gold text-unyam-ink font-heading font-extrabold text-base shadow-[0_6px_20px_-4px_rgba(229,182,73,0.55)] hover:bg-unyam-gold/90 hover:shadow-[0_8px_24px_-4px_rgba(229,182,73,0.65)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all"
          >
            {loading ? '作成中...' : '対戦スタート'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push('/play')}
            disabled={loading}
            size="sm"
            className="w-full text-unyam-ink-muted hover:text-unyam-ink font-heading font-bold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </Button>
        </div>
      </div>
    </div>
  )
}
