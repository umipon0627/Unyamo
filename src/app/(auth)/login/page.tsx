'use client'

import { signIn } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function LoginPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loadingGuest, setLoadingGuest] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session) router.push('/lobby')
  }, [session, router])

  async function handleGuestPlay() {
    setLoadingGuest(true)
    setError('')
    try {
      const res = await fetch('/api/auth/guest', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error ?? 'ゲストセッションの作成に失敗しました')
        return
      }
      router.push('/lobby')
      // 確実にサーバーセッションを認識させる
      router.refresh()
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoadingGuest(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-unyamo-cream">
      {/* ロゴ */}
      <div className="mb-8 text-center">
        <p className="font-heading text-sm font-bold text-unyamo-ink-muted tracking-widest uppercase mb-1">
          CARD GAME
        </p>
        <h1 className="font-heading text-4xl font-extrabold text-unyamo-ink">
          Unyamo
        </h1>
      </div>

      <Card className="w-full max-w-sm bg-unyamo-surface border-2 border-unyamo-border shadow-[0_12px_40px_-8px_rgba(40,30,20,0.18)]">
        <CardHeader className="pb-2">
          <h2 className="font-heading text-xl font-bold text-unyamo-ink text-center leading-snug">
            アカウントを連携して<br />はじめましょう。
          </h2>
          <p className="text-sm text-unyamo-ink-muted text-center mt-1">
            ゲストでも無料ですぐ遊べます。戦績の保存はアカウント登録が必要です。
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pb-6">
          {/* Google */}
          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/lobby' })}
            className="flex items-center gap-3 w-full h-12 rounded-2xl border-2 border-unyamo-border bg-unyamo-surface px-4 font-heading font-bold text-unyamo-ink text-sm hover:bg-unyamo-cream hover:border-unyamo-ink-muted transition-all active:scale-95 shadow-[0_3px_10px_-4px_rgba(40,30,20,0.12)]"
          >
            {/* Google SVG icon */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google で続ける
          </button>

          {/* GitHub */}
          <button
            type="button"
            onClick={() => signIn('github', { callbackUrl: '/lobby' })}
            className="flex items-center gap-3 w-full h-12 rounded-2xl border-2 border-unyamo-border bg-unyamo-surface px-4 font-heading font-bold text-unyamo-ink text-sm hover:bg-unyamo-cream hover:border-unyamo-ink-muted transition-all active:scale-95 shadow-[0_3px_10px_-4px_rgba(40,30,20,0.12)]"
          >
            {/* GitHub SVG icon */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            GitHub で続ける
          </button>

          {/* 区切り */}
          <div className="relative my-1">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-unyamo-surface px-3 text-xs font-heading font-bold text-unyamo-ink-muted">
                または
              </span>
            </div>
          </div>

          {/* ゲスト */}
          <button
            type="button"
            onClick={handleGuestPlay}
            disabled={loadingGuest}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl font-heading font-bold text-sm text-unyamo-ink-muted hover:text-unyamo-ink transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loadingGuest ? '準備中...' : 'ゲストで開始'}
          </button>

          {error && (
            <p className="text-unyamo-red text-sm text-center font-heading font-bold bg-unyamo-red/10 border border-unyamo-red/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {/* 利用規約 */}
          <p className="text-[11px] text-unyamo-ink-muted/60 text-center leading-relaxed mt-1">
            続けることで
            <span className="underline underline-offset-2 cursor-pointer hover:text-unyamo-ink-muted">利用規約</span>
            ・
            <span className="underline underline-offset-2 cursor-pointer hover:text-unyamo-ink-muted">プライバシーポリシー</span>
            に同意します
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
