'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function Header() {
  const { data: session } = useSession()

  return (
    <header className="border-b border-slate-700 bg-slate-800">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-emerald-400">
          Unyamo
        </Link>
        <nav className="flex items-center gap-4">
          {session ? (
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
                    <AvatarImage src={session.user.image ?? ''} />
                    <AvatarFallback>{session.user.name?.[0] ?? 'U'}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => signOut()}>
                    ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600">
                ログイン
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
