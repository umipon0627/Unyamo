export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker'

export interface Card {
  id: string
  suit: Suit
  rank: number // 1-13, joker=0
}

export function getCardScore(card: Card): number {
  if (card.suit === 'joker') return 0
  if (card.rank >= 11) return card.rank // J=11, Q=12, K=13
  return card.rank // A=1, 2-10
}
