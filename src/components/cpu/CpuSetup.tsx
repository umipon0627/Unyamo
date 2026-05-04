'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bot } from 'lucide-react'
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

  return (
    <div className="flex flex-col min-h-screen bg-slate-900">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-emerald-900/50 flex items-center justify-center">
              <Bot className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">CPU対戦セットアップ</h1>
              <p className="text-slate-400 text-sm">対戦設定を選んでください</p>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-6">
            {/* CPU人数 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                CPU人数
              </label>
              <div className="flex gap-2">
                {([1, 2, 3] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setCpuCount(count)}
                    className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${
                      cpuCount === count
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:border-slate-500'
                    }`}
                  >
                    {count}体
                  </button>
                ))}
              </div>
            </div>

            {/* 難易度 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
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
                    className={`flex-1 py-3 px-2 rounded-lg border text-sm font-medium transition-colors ${
                      difficulty === value
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <div>{label}</div>
                    <div className="text-xs font-normal opacity-75 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* エラー表示 */}
            {error && (
              <p className="text-red-400 text-sm bg-red-950/30 border border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* ボタン */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={handleStart}
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold py-3 disabled:opacity-50"
              >
                {loading ? '作成中...' : 'ゲーム開始'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push('/play')}
                disabled={loading}
                className="w-full text-slate-400 hover:text-slate-200"
              >
                戻る
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
