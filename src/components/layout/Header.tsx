'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface GuestUser {
  id: string
  name: string
  isGuest: true
}

export default function Header() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [guestRaw, setGuestRaw] = useState<GuestUser | null>(null)
  const [guestFetched, setGuestFetched] = useState(false)

  // NextAuth セッションが無いときだけ guest セッションを fetch する
  useEffect(() => {
    if (status === 'loading') return
    if (session) return
    let cancelled = false
    fetch('/api/auth/guest')
      .then(r => r.ok ? r.json() : null)
      .then((data: { user: GuestUser | null } | null) => {
        if (cancelled) return
        setGuestRaw(data?.user ?? null)
        setGuestFetched(true)
      })
      .catch(() => {
        if (cancelled) return
        setGuestFetched(true)
      })
    return () => { cancelled = true }
  }, [session, status])

  // session があれば guest 表示はしない（state には触らず派生値で扱う）
  const guest = session ? null : guestRaw
  const guestChecked = !!session || guestFetched

  async function handleGuestLogout() {
    await fetch('/api/auth/guest', { method: 'DELETE' })
    setGuestRaw(null)
    router.push('/login')
    router.refresh()
  }

  const isAuthed = !!session
  const isGuest = !session && !!guest

  return (
    <header className="border-b border-slate-700 bg-slate-800">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-emerald-400">
          Unyamo
        </Link>
        <nav className="flex items-center gap-4">
          {isAuthed ? (
            <>
              <Link href="/lobby" className="text-sm text-slate-300 hover:text-white">
                ロビー
              </Link>
              <Link href="/profile" className="text-sm text-slate-300 hover:text-white">
                プロフィール
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="cursor-pointer rounded-full focus:outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session?.user?.image ?? ''} />
                    <AvatarFallback>{session?.user?.name?.[0] ?? 'U'}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => signOut()}>
                    ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : isGuest ? (
            <>
              <Link href="/lobby" className="text-sm text-slate-300 hover:text-white">
                ロビー
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="cursor-pointer rounded-md px-2 py-1 hover:bg-slate-700 focus:outline-none flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-amber-500 text-amber-950 text-xs font-bold">
                      G
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-amber-300 max-w-[140px] truncate">
                    {guest?.name}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled className="text-xs text-slate-400">
                    ゲストモード
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleGuestLogout}>
                    ゲストを終了
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : guestChecked ? (
            <Link href="/login">
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600">
                ログイン
              </Button>
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
