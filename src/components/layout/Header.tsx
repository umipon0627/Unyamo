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
import ThemeToggle from '@/components/layout/ThemeToggle'

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
    <header className="border-b-2 border-unyamo-border bg-unyamo-surface/90 backdrop-blur-sm sticky top-0 z-40 pt-safe px-safe">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-heading text-xl font-bold text-unyamo-green hover:text-unyamo-green/80 transition-colors"
        >
          Unyamo
        </Link>
        <nav className="flex items-center gap-3">
          <ThemeToggle />
          {isAuthed ? (
            <>
              <Link
                href="/play"
                className="text-sm font-heading font-bold text-unyamo-ink-muted hover:text-unyamo-ink transition-colors"
              >
                プレイ
              </Link>
              <Link
                href="/profile"
                className="text-sm font-heading font-bold text-unyamo-ink-muted hover:text-unyamo-ink transition-colors"
              >
                プロフィール
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="cursor-pointer rounded-full focus:outline-none ring-2 ring-unyamo-border hover:ring-unyamo-green transition-all">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session?.user?.image ?? ''} />
                    <AvatarFallback className="bg-unyamo-green text-unyamo-cream text-xs font-heading font-bold">
                      {session?.user?.name?.[0] ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl border-2 border-unyamo-border bg-unyamo-surface shadow-[0_8px_24px_-6px_rgba(40,30,20,0.18)]">
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="font-heading font-bold text-unyamo-ink hover:bg-unyamo-cream rounded-xl cursor-pointer"
                  >
                    ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : isGuest ? (
            <>
              <Link
                href="/play"
                className="text-sm font-heading font-bold text-unyamo-ink-muted hover:text-unyamo-ink transition-colors"
              >
                プレイ
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="cursor-pointer rounded-full px-3 py-1 hover:bg-unyamo-cream focus:outline-none flex items-center gap-2 border-2 border-unyamo-gold/50 transition-all">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-unyamo-gold text-unyamo-ink text-xs font-heading font-bold">
                      G
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-heading font-bold text-unyamo-gold-deep max-w-[140px] truncate">
                    {guest?.name}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl border-2 border-unyamo-border bg-unyamo-surface shadow-[0_8px_24px_-6px_rgba(40,30,20,0.18)]">
                  <DropdownMenuItem disabled className="text-xs text-unyamo-ink-muted font-heading">
                    ゲストモード
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleGuestLogout}
                    className="font-heading font-bold text-unyamo-ink hover:bg-unyamo-cream rounded-xl cursor-pointer"
                  >
                    ゲストを終了
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : guestChecked ? (
            <Link href="/login">
              <Button size="sm" className="bg-unyamo-green text-unyamo-cream font-heading font-bold">
                ログイン
              </Button>
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
