import { describe, it, expect } from 'vitest'
import { canDeclareUnyam, judgeWinner } from '@/game-logic/unyam'
import type { Card } from '@/types/card'

const makeCard = (rank: number, suit: Card['suit'] = 'spades'): Card => ({
  id: `card-${rank}-${suit}-${Math.random()}`,
  suit,
  rank,
})

describe('canDeclareUnyam', () => {
  it('returns true when score <= 5', () => {
    expect(canDeclareUnyam([makeCard(1), makeCard(2), makeCard(0, 'joker')])).toBe(true)
  })
  it('returns true when score exactly 5', () => {
    expect(canDeclareUnyam([makeCard(2), makeCard(3)])).toBe(true)
  })
  it('returns false when score > 5', () => {
    expect(canDeclareUnyam([makeCard(3), makeCard(4)])).toBe(false)
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

  it('宣言者勝利時、非宣言者を点数昇順で2位以降に順位付けする', () => {
    const players = [
      { id: 'declarer', hand: [makeCard(3)] }, // 3点 宣言・勝者
      { id: 'a', hand: [makeCard(4)] }, // 4点 → 2位
      { id: 'b', hand: [makeCard(5)] }, // 5点 → 3位
      { id: 'c', hand: [makeCard(11)] }, // 11点 → 4位
    ]
    const results = judgeWinner(players, 'declarer')
    const rankOf = (id: string) => results.find(r => r.playerId === id)!.rank
    expect(rankOf('declarer')).toBe(1)
    expect(results.find(r => r.playerId === 'declarer')!.isWinner).toBe(true)
    expect(rankOf('a')).toBe(2)
    expect(rankOf('b')).toBe(3)
    expect(rankOf('c')).toBe(4)
  })

  it('宣言者敗北時、最小点の非宣言者が勝者・1位、宣言者は最下位', () => {
    const players = [
      { id: 'declarer', hand: [makeCard(5)] }, // 5点 宣言 → 最下位
      { id: 'a', hand: [makeCard(4)] }, // 4点 → 1位・勝者
      { id: 'b', hand: [makeCard(8)] }, // 8点 → 2位
    ]
    const results = judgeWinner(players, 'declarer')
    const get = (id: string) => results.find(r => r.playerId === id)!
    expect(get('a').rank).toBe(1)
    expect(get('a').isWinner).toBe(true)
    expect(get('b').rank).toBe(2)
    expect(get('declarer').rank).toBe(3)
    expect(get('declarer').isWinner).toBe(false)
  })

  it('同点の非宣言者は同順位になる', () => {
    const players = [
      { id: 'declarer', hand: [makeCard(2)] }, // 2点 宣言・勝者
      { id: 'a', hand: [makeCard(5)] }, // 5点 → 2位
      { id: 'b', hand: [makeCard(5)] }, // 5点 → 2位（同点）
    ]
    const results = judgeWinner(players, 'declarer')
    const get = (id: string) => results.find(r => r.playerId === id)!
    expect(get('declarer').rank).toBe(1)
    expect(get('a').rank).toBe(2)
    expect(get('b').rank).toBe(2)
  })
})
