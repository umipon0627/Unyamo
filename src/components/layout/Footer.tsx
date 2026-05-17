'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = {
  href: string
  label: string
  icon: string
  exactMatch?: boolean
}

// プレイ・ロビー・プロフィールを統合したタブバー（戦績=/profileに集約）
const tabItems: NavItem[] = [
  { href: '/play', label: 'プレイ', icon: '🎮' },
  { href: '/lobby', label: 'ロビー', icon: '🏠' },
  { href: '/profile', label: '戦績/プロフ', icon: '👤' },
]

export default function Footer() {
  const pathname = usePathname()

  function isActive(item: NavItem): boolean {
    if (item.exactMatch) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  return (
    <>
      {/* モバイル下部タブバー（md未満で表示） */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-unyamo-surface border-t-2 border-unyamo-border shadow-[0_-4px_16px_-4px_rgba(40,30,20,0.12)]"
        aria-label="メインナビゲーション"
      >
        <div className="flex h-16">
          {tabItems.map((item) => {
            const active = isActive(item)
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active
                    ? 'text-unyamo-green'
                    : 'text-unyamo-ink-muted hover:text-unyamo-ink'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span
                  className={`text-xs font-heading font-bold ${
                    active ? 'text-unyamo-green' : 'text-unyamo-ink-muted'
                  }`}
                >
                  {item.label}
                </span>
                {active && (
                  <span className="absolute bottom-1 w-5 h-0.5 rounded-full bg-unyamo-green" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* デスクトップフッター（md以上で表示） */}
      <footer className="hidden md:block border-t-2 border-unyamo-border bg-unyamo-surface py-5 pb-5">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <p className="text-sm font-heading text-unyamo-ink-muted">
            © 2024 Unyamo
          </p>
          <nav className="flex items-center gap-6" aria-label="フッターナビゲーション">
            {tabItems.map((item) => {
              const active = isActive(item)
              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={`flex items-center gap-1.5 text-sm font-heading font-bold transition-colors ${
                    active
                      ? 'text-unyamo-green'
                      : 'text-unyamo-ink-muted hover:text-unyamo-ink'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </footer>

      {/* モバイルタブバー分のスペーサー（md未満のみ） */}
      <div className="md:hidden h-16" aria-hidden="true" />
    </>
  )
}
