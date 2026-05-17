import { cn } from '@/lib/utils'
import type { Card as CardType } from '@/types/card'

interface CardProps {
  card?: CardType
  faceDown?: boolean
  size?: 'sm' | 'md' | 'lg'
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
  joker: '★',
}

const RANK_LABELS: Record<number, string> = {
  1: 'A', 11: 'J', 12: 'Q', 13: 'K',
}

function getRankLabel(rank: number): string {
  return RANK_LABELS[rank] ?? String(rank)
}

const SIZE_CLASSES = {
  sm: 'w-10 h-14 text-xs',
  md: 'w-14 h-20 text-sm',
  lg: 'w-16 h-24 text-base',
}

export function Card({ card, faceDown = false, size = 'md', selected = false, onClick, disabled = false }: CardProps) {
  const isRed = card?.suit === 'hearts' || card?.suit === 'diamonds'
  const isJoker = card?.suit === 'joker'

  const label = card
    ? `${isJoker ? 'ジョーカー' : `${SUIT_SYMBOLS[card.suit]}の${getRankLabel(card.rank)}`}`
    : '裏向きカード'

  if (faceDown || !card) {
    return (
      <div
        className={cn(
          'rounded-[10px] border-2 border-[#1e6b4d]/60',
          'bg-gradient-to-br from-[#2a7d5c] via-[#1e6b4d] to-[#0e2f22]',
          'flex items-center justify-center shadow-md',
          SIZE_CLASSES[size],
          onClick && !disabled && 'cursor-pointer hover:brightness-110 active:scale-95',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        onClick={!disabled ? onClick : undefined}
        aria-label="裏向きカード"
      >
        <span className="text-[#f0d89a]/60 font-bold text-lg select-none">✦</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-[10px] flex flex-col items-start justify-between p-1 shadow-md select-none',
        'bg-[#fffefa] border-2',
        isRed ? 'border-[#c8202b]/30 text-[#c8202b]' : isJoker ? 'border-[#e5b649]/50 text-[#1e6b4d]' : 'border-[#e7ddc8] text-[#1f242b]',
        SIZE_CLASSES[size],
        selected && '-translate-y-4 ring-2 ring-[#e5b649] shadow-lg shadow-[#e5b649]/30',
        onClick && !disabled && 'cursor-pointer hover:-translate-y-1 transition-transform',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
      onClick={!disabled ? onClick : undefined}
      aria-label={label}
      role={onClick ? 'button' : undefined}
      aria-pressed={onClick ? selected : undefined}
    >
      <div className="leading-none">
        <div className="font-bold">{isJoker ? 'JK' : getRankLabel(card.rank)}</div>
        <div>{SUIT_SYMBOLS[card.suit]}</div>
      </div>
      <div className="self-center text-2xl leading-none">{SUIT_SYMBOLS[card.suit]}</div>
      <div className="self-end rotate-180 leading-none">
        <div className="font-bold">{isJoker ? 'JK' : getRankLabel(card.rank)}</div>
        <div>{SUIT_SYMBOLS[card.suit]}</div>
      </div>
    </div>
  )
}
