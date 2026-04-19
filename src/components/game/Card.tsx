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

  const label = card
    ? `${card.suit === 'joker' ? 'ジョーカー' : `${SUIT_SYMBOLS[card.suit]}の${getRankLabel(card.rank)}`}`
    : '裏向きカード'

  if (faceDown || !card) {
    return (
      <div
        className={cn(
          'rounded-lg border border-slate-600 bg-gradient-to-br from-emerald-900 to-slate-800 flex items-center justify-center shadow-md',
          SIZE_CLASSES[size],
          onClick && !disabled && 'cursor-pointer hover:brightness-110',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        onClick={!disabled ? onClick : undefined}
        aria-label="裏向きカード"
      >
        <span className="text-emerald-700 font-bold text-lg select-none">✦</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-slate-300 bg-white flex flex-col items-start justify-between p-1 shadow-md select-none transition-transform',
        SIZE_CLASSES[size],
        isRed ? 'text-red-600' : 'text-slate-900',
        card.suit === 'joker' && 'text-emerald-600',
        selected && '-translate-y-4 ring-2 ring-emerald-400',
        onClick && !disabled && 'cursor-pointer hover:-translate-y-1',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
      onClick={!disabled ? onClick : undefined}
      aria-label={label}
      role={onClick ? 'button' : undefined}
    >
      <div className="leading-none">
        <div className="font-bold">{card.suit === 'joker' ? 'JK' : getRankLabel(card.rank)}</div>
        <div>{SUIT_SYMBOLS[card.suit]}</div>
      </div>
      <div className="self-center text-2xl leading-none">{SUIT_SYMBOLS[card.suit]}</div>
      <div className="self-end rotate-180 leading-none">
        <div className="font-bold">{card.suit === 'joker' ? 'JK' : getRankLabel(card.rank)}</div>
        <div>{SUIT_SYMBOLS[card.suit]}</div>
      </div>
    </div>
  )
}
