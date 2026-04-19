import { describe, it, expect } from 'vitest'
import { createDeck, shuffleDeck, dealCards, drawFromDeck, drawFromDiscardPile } from '@/game-logic/deck'

describe('createDeck', () => {
  it('creates 54 cards with 2 jokers by default', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(54)
    expect(deck.filter(c => c.suit === 'joker')).toHaveLength(2)
  })
  it('creates 52 cards with 0 jokers', () => {
    const deck = createDeck(0)
    expect(deck).toHaveLength(52)
  })
  it('assigns unique IDs to all cards', () => {
    const deck = createDeck()
    const ids = new Set(deck.map(c => c.id))
    expect(ids.size).toBe(54)
  })
})

describe('shuffleDeck', () => {
  it('returns same number of cards', () => {
    const deck = createDeck()
    const shuffled = shuffleDeck(deck)
    expect(shuffled).toHaveLength(deck.length)
  })
  it('does not mutate the original deck', () => {
    const deck = createDeck()
    const original = [...deck]
    shuffleDeck(deck)
    expect(deck).toEqual(original)
  })
})

describe('dealCards', () => {
  it('deals 3 cards to each player', () => {
    const deck = createDeck()
    const { hands, remainingDeck } = dealCards(deck, 4, 3)
    expect(hands).toHaveLength(4)
    hands.forEach(h => expect(h).toHaveLength(3))
    expect(remainingDeck).toHaveLength(54 - 12)
  })
})

describe('drawFromDeck', () => {
  it('returns null card for empty deck', () => {
    const { card } = drawFromDeck([])
    expect(card).toBeNull()
  })
  it('removes top card from deck', () => {
    const deck = createDeck()
    const { card, remainingDeck } = drawFromDeck(deck)
    expect(card).toBeDefined()
    expect(remainingDeck).toHaveLength(53)
  })
})
