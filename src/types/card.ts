export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker'

export interface Card {
  suit: Suit
  rank: number // 1-13, joker=0
  id: string   // crypto.randomUUID() 由来のユニークID
}
