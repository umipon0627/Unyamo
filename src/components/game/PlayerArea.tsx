'use client'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface PlayerAreaProps {
  player: {
    id: string
    name: string
    image?: string
    cardCount: number
    isConnected: boolean
  }
  isCurrentTurn: boolean
  hasDeclaredUnyamo: boolean
  position: 'top' | 'left' | 'right'
  compact?: boolean
}

// 簡易的なカラーハッシュ（プレイヤー名ベース）
const AVATAR_COLORS = [
  'bg-[#c8202b]',
  'bg-[#2e9c8a]',
  'bg-[#3d5a80]',
  'bg-[#e5b649]',
  'bg-[#34a853]',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i)) % AVATAR_COLORS.length
  }
  return AVATAR_COLORS[hash] ?? 'bg-[#2e9c8a]'
}

export function PlayerArea({ player, isCurrentTurn, hasDeclaredUnyamo, compact = false }: PlayerAreaProps) {
  const avatarColor = getAvatarColor(player.name)
  const initial = player.name[0]?.toUpperCase() ?? '?'

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1 px-2 py-1.5 rounded-2xl transition-all',
        'bg-[#f2eee6]/10 border border-[#f2eee6]/10',
        isCurrentTurn && 'ring-2 ring-[#c8202b] bg-[#c8202b]/10 border-[#c8202b]/30',
        !player.isConnected && 'opacity-40',
      )}
      aria-label={`${player.name} ${player.cardCount}枚${isCurrentTurn ? ' 現在のターン' : ''}${hasDeclaredUnyamo ? ' ウニャモ宣言済' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        <Avatar className="h-7 w-7">
          <AvatarImage src={player.image} alt={player.name} />
          <AvatarFallback className={cn('text-xs font-bold text-white', avatarColor)}>
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-[#f2eee6]/90 font-medium max-w-16 truncate leading-none">
            {player.name}
          </span>
          <span className="text-[10px] text-[#f2eee6]/50 leading-none mt-0.5">
            {player.cardCount}枚
          </span>
        </div>
        {hasDeclaredUnyamo && (
          <Badge className="bg-[#e5b649] text-[#281e14] text-[9px] px-1 py-0 font-heading font-bold">
            宣言
          </Badge>
        )}
      </div>
      {!compact && (
        // 伏せ札サムネ: compact=false時のみ表示（現状のコンパクト表示と同じ枚数テキスト）
        <div className="flex gap-0.5 justify-center mt-0.5">
          {Array.from({ length: Math.min(player.cardCount, 5) }, (_, i) => (
            <div
              key={i}
              className="w-3 h-4 rounded-sm bg-gradient-to-br from-[#2a7d5c] to-[#0e2f22] border border-[#1e6b4d]/40 shadow-sm"
              aria-hidden="true"
            />
          ))}
          {player.cardCount > 5 && (
            <span className="text-[#f2eee6]/40 text-[9px] ml-0.5">+{player.cardCount - 5}</span>
          )}
        </div>
      )}
    </div>
  )
}
