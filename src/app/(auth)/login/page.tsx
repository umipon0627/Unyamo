'use client'

import { signIn } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-center text-emerald-400">Unyamo を始める</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            onClick={() => signIn('google', { callbackUrl: '/lobby' })}
            variant="outline"
            className="border-slate-600 hover:bg-slate-700"
          >
            Google でログイン
          </Button>
          <Button
            onClick={() => signIn('github', { callbackUrl: '/lobby' })}
            variant="outline"
            className="border-slate-600 hover:bg-slate-700"
          >
            GitHub でログイン
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-800 px-2 text-slate-400">または</span>
            </div>
          </div>

          <Button
            onClick={handleGuestPlay}
            disabled={loadingGuest}
            className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold"
          >
            {loadingGuest ? '準備中...' : 'ゲストとして参加'}
          </Button>
          <p className="text-xs text-slate-400 text-center">
            ※ ゲストは戦績が保存されません
          </p>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
