'use client'

import { signIn } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) router.push('/lobby')
  }, [session, router])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-center text-emerald-400">Unyamo にログイン</CardTitle>
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
        </CardContent>
      </Card>
    </div>
  )
}
