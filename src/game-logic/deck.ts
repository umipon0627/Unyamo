import type { Card, Suit } from '@/types/card'

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']

export function createDeck(jokerCount: number = 2): Card[] {
  const cards: Card[] = []
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      cards.push({ suit, rank, id: crypto.randomUUID() })
    }
  }
  const actualJokers = Math.min(jokerCount, 2)
  for (let i = 0; i < actualJokers; i++) {
    cards.push({ suit: 'joker', rank: 0, id: crypto.randomUUID() })
  }
  return cards
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = shuffled[i]!
    shuffled[i] = shuffled[j]!
    shuffled[j] = temp
  }
  return shuffled
}

export function dealCards(
  deck: Card[],
  playerCount: number,
  cardsPerPlayer: number = 3
): { hands: Card[][]; remainingDeck: Card[] } {
  const hands: Card[][] = Array.from({ length: playerCount }, () => [])
  const remaining = [...deck]
  for (let c = 0; c < cardsPerPlayer; c++) {
    for (let p = 0; p < playerCount; p++) {
      const card = remaining.shift()
      if (card) hands[p]!.push(card)
    }
  }
  return { hands, remainingDeck: remaining }
}

export function drawFromDeck(deck: Card[]): { card: Card | null; remainingDeck: Card[] } {
  if (deck.length === 0) return { card: null, remainingDeck: [] }
  const [card, ...remainingDeck] = deck
  return { card: card!, remainingDeck }
}

export function drawFromDiscardPile(discardPile: Card[]): { card: Card | null; remainingPile: Card[] } {
  if (discardPile.length === 0) return { card: null, remainingPile: [] }
  const remaining = [...discardPile]
  const card = remaining.pop()!
  return { card, remainingPile: remaining }
}
