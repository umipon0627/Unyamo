import { describe, it, expect } from 'vitest'
import { canDeclareUnyamo, judgeWinner } from '@/game-logic/unyamo'
import type { Card } from '@/types/card'

const makeCard = (rank: number, suit: Card['suit'] = 'spades'): Card => ({
  id: `card-${rank}-${suit}-${Math.random()}`,
  suit,
  rank,
})

describe('canDeclareUnyamo', () => {
  it('returns true when score <= 5', () => {
    expect(canDeclareUnyamo([makeCard(1), makeCard(2), makeCard(0, 'joker')])).toBe(true)
  })
  it('returns true when score exactly 5', () => {
    expect(canDeclareUnyamo([makeCard(2), makeCard(3)])).toBe(true)
  })
  it('returns false when score > 5', () => {
    expect(canDeclareUnyamo([makeCard(3), makeCard(4)])).toBe(false)
  })
})

describe('judgeWinner', () => {
  it('declarer wins when they have lowest score', () => {
    const players = [
      { id: 'declarer', hand: [makeCard(1)] },
      { id: 'other1', hand: [makeCard(5)] },
      { id: 'other2', hand: [makeCard(8)] },
    ]
    const results = judgeWinner(players, 'declarer')
    const declarerResult = results.find(r => r.playerId === 'declarer')!
    expect(declarerResult.isWinner).toBe(true)
    expect(declarerResult.rank).toBe(1)
  })
  it('declarer loses when another player has equal score (仕様2.5節)', () => {
    const players = [
      { id: 'declarer', hand: [makeCard(3)] },
      { id: 'other', hand: [makeCard(3)] },
    ]
    const results = judgeWinner(players, 'declarer')
    const declarerResult = results.find(r => r.playerId === 'declarer')!
    expect(declarerResult.isWinner).toBe(false)
    expect(declarerResult.rank).toBe(players.length) // 最下位
  })
  it('declarer loses when another player has lower score', () => {
    const players = [
      { id: 'declarer', hand: [makeCard(4)] },
      { id: 'other', hand: [makeCard(2)] },
    ]
    const results = judgeWinner(players, 'declarer')
    const declarerResult = results.find(r => r.playerId === 'declarer')!
    expect(declarerResult.isWinner).toBe(false)
    expect(declarerResult.rank).toBe(players.length)
  })
})
