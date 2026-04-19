import { describe, it, expect } from 'vitest'
import { getCardScore, calculateHandScore, rankPlayers } from '@/game-logic/scoring'
import type { Card } from '@/types/card'

const makeCard = (rank: number, suit: Card['suit'] = 'spades'): Card => ({
  id: `card-${rank}-${suit}`,
  suit,
  rank,
})

describe('getCardScore', () => {
  it('Ace = 1', () => expect(getCardScore(makeCard(1))).toBe(1))
  it('2 = 2', () => expect(getCardScore(makeCard(2))).toBe(2))
  it('10 = 10', () => expect(getCardScore(makeCard(10))).toBe(10))
  it('J = 11', () => expect(getCardScore(makeCard(11))).toBe(11))
  it('Q = 12', () => expect(getCardScore(makeCard(12))).toBe(12))
  it('K = 13', () => expect(getCardScore(makeCard(13))).toBe(13))
  it('Joker = 0', () => expect(getCardScore(makeCard(0, 'joker'))).toBe(0))
})

describe('calculateHandScore', () => {
  it('sums hand correctly', () => {
    const hand = [makeCard(1), makeCard(2), makeCard(0, 'joker')]
    expect(calculateHandScore(hand)).toBe(3)
  })
})

describe('rankPlayers', () => {
  it('ranks players by score ascending', () => {
    const result = rankPlayers([{ id: 'b', score: 10 }, { id: 'a', score: 5 }])
    expect(result[0]!.id).toBe('a')
    expect(result[0]!.rank).toBe(1)
  })
})
