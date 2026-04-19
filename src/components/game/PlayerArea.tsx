'use client'

import { cn } from '@/lib/utils'
import { Hand } from './Hand'
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

export function PlayerArea({ player, isCurrentTurn, hasDeclaredUnyamo, position, compact = false }: PlayerAreaProps) {
  const fakeCards = Array.from({ length: player.cardCount }, (_, i) => ({
    id: `fake-${player.id}-${i}`,
    suit: 'spades' as const,
    rank: 0,
  }))

  return (
    <div className={cn(
      'flex flex-col items-center gap-1 p-2 rounded-xl transition-all',
      isCurrentTurn && 'ring-2 ring-emerald-500',
      !player.isConnected && 'opacity-40',
    )}>
      <div className="flex items-center gap-1">
        <Avatar className="h-7 w-7">
          <AvatarImage src={player.image} />
          <AvatarFallback className="text-xs bg-slate-700">{player.name[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="text-xs text-slate-300 max-w-16 truncate">{player.name}</span>
        {hasDeclaredUnyamo && (
          <Badge className="bg-amber-500 text-white text-xs px-1 py-0">宣言</Badge>
        )}
      </div>
      {!compact && (
        <Hand cards={fakeCards} faceDown size="sm" isMobile />
      )}
      {compact && (
        <span className="text-xs text-slate-400">{player.cardCount}枚</span>
      )}
    </div>
  )
}
