import type { Card } from '@/types/card'

export function getCardScore(card: Card): number {
  if (card.suit === 'joker') return 0
  return card.rank // A=1, 2-10=数字通り, J=11, Q=12, K=13
}

export function calculateHandScore(hand: Card[]): number {
  return hand.reduce((sum, card) => sum + getCardScore(card), 0)
}

export function rankPlayers(
  players: { id: string; score: number }[]
): { id: string; score: number; rank: number }[] {
  const sorted = [...players].sort((a, b) => a.score - b.score)
  return sorted.map((player, index) => {
    const rank = sorted.findIndex(p => p.score === player.score) + 1
    return { ...player, rank }
  })
}
