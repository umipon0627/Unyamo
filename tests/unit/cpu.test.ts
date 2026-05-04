import { describe, it, expect } from 'vitest'
import { decideUnyamoDeclaration, decideDrawSource, decideDiscard } from '@/game-logic/cpu'
import type { Card } from '@/types/card'

// テスト用カードヘルパー
function makeCard(rank: number, suit: Card['suit'] = 'hearts', id?: string): Card {
  return { rank, suit, id: id ?? `card-${suit}-${rank}` }
}

function makeJoker(id = 'joker-1'): Card {
  return { rank: 0, suit: 'joker', id }
}

describe('decideUnyamoDeclaration', () => {
  it('手札合計6点以上なら常に false', () => {
    const hand = [makeCard(3), makeCard(4)] // 7点
    expect(decideUnyamoDeclaration(hand, 'HARD')).toBe(false)
    expect(decideUnyamoDeclaration(hand, 'EASY')).toBe(false)
  })

  it('ちょうど6点なら false', () => {
    const hand = [makeCard(2), makeCard(4)] // 6点
    expect(decideUnyamoDeclaration(hand, 'HARD')).toBe(false)
    expect(decideUnyamoDeclaration(hand, 'EASY')).toBe(false)
  })

  it('手札合計5点以下 + HARD なら必ず true', () => {
    const hand = [makeCard(2), makeCard(3)] // 5点
    expect(decideUnyamoDeclaration(hand, 'HARD')).toBe(true)
  })

  it('手札合計0点(ジョーカーのみ) + HARD なら true', () => {
    const hand = [makeJoker()]
    expect(decideUnyamoDeclaration(hand, 'HARD')).toBe(true)
  })

  it('手札合計5点以下 + EASY + rng=()=>0.4 なら true', () => {
    const hand = [makeCard(1), makeCard(2)] // 3点
    expect(decideUnyamoDeclaration(hand, 'EASY', () => 0.4)).toBe(true)
  })

  it('手札合計5点以下 + EASY + rng=()=>0.5 なら false（0.5は境界値）', () => {
    const hand = [makeCard(1), makeCard(2)] // 3点
    expect(decideUnyamoDeclaration(hand, 'EASY', () => 0.5)).toBe(false)
  })

  it('手札合計5点以下 + EASY + rng=()=>0.9 なら false', () => {
    const hand = [makeCard(1), makeCard(2)] // 3点
    expect(decideUnyamoDeclaration(hand, 'EASY', () => 0.9)).toBe(false)
  })
})

describe('decideDrawSource', () => {
  const hand = [makeCard(5), makeCard(8), makeCard(3)] // 最高点: 8

  it('canPickupFromDiscard=false なら常に deck', () => {
    const discardTop = makeCard(2)
    expect(decideDrawSource(hand, discardTop, false, 'EASY')).toBe('deck')
    expect(decideDrawSource(hand, discardTop, false, 'HARD')).toBe('deck')
  })

  it('discardTop=null なら常に deck', () => {
    expect(decideDrawSource(hand, null, true, 'EASY')).toBe('deck')
    expect(decideDrawSource(hand, null, true, 'HARD')).toBe('deck')
  })

  it('HARD + 捨て札スコア < 手札最高点 → discard（有利な入れ替え）', () => {
    const discardTop = makeCard(6) // 6 < 8
    expect(decideDrawSource(hand, discardTop, true, 'HARD')).toBe('discard')
  })

  it('HARD + 捨て札スコア = 手札最高点 → deck（不利でも有利でもない）', () => {
    const discardTop = makeCard(8) // 8 = 8
    expect(decideDrawSource(hand, discardTop, true, 'HARD')).toBe('deck')
  })

  it('HARD + 捨て札スコア > 手札最高点 → deck（不利な入れ替え）', () => {
    const discardTop = makeCard(10) // 10 > 8
    expect(decideDrawSource(hand, discardTop, true, 'HARD')).toBe('deck')
  })

  it('EASY + canPickupFromDiscard=true + rng=()=>0.3 → discard', () => {
    const discardTop = makeCard(2)
    expect(decideDrawSource(hand, discardTop, true, 'EASY', () => 0.3)).toBe('discard')
  })

  it('EASY + canPickupFromDiscard=true + rng=()=>0.7 → deck', () => {
    const discardTop = makeCard(2)
    expect(decideDrawSource(hand, discardTop, true, 'EASY', () => 0.7)).toBe('deck')
  })
})

describe('decideDiscard', () => {
  it('空の手札では空配列を返す', () => {
    expect(decideDiscard([], 'HARD')).toEqual([])
    expect(decideDiscard([], 'EASY')).toEqual([])
  })

  it('HARD + 同数字ペアあり → 特殊操作（2枚返す）', () => {
    const hand = [
      makeCard(7, 'hearts', 'c1'),
      makeCard(7, 'spades', 'c2'),
      makeCard(3, 'clubs', 'c3'),
    ]
    const result = decideDiscard(hand, 'HARD')
    expect(result).toHaveLength(2)
    expect(result).toContain('c1')
    expect(result).toContain('c2')
  })

  it('HARD + 同数字3枚あり → 特殊操作（3枚返す）', () => {
    const hand = [
      makeCard(9, 'hearts', 'c1'),
      makeCard(9, 'spades', 'c2'),
      makeCard(9, 'clubs', 'c3'),
      makeCard(2, 'diamonds', 'c4'),
    ]
    const result = decideDiscard(hand, 'HARD')
    expect(result).toHaveLength(3)
    expect(result).toContain('c1')
    expect(result).toContain('c2')
    expect(result).toContain('c3')
  })

  it('HARD + 複数グループあれば最高点グループを選ぶ', () => {
    const hand = [
      makeCard(3, 'hearts', 'low1'),
      makeCard(3, 'spades', 'low2'),
      makeCard(9, 'clubs', 'high1'),
      makeCard(9, 'diamonds', 'high2'),
    ]
    const result = decideDiscard(hand, 'HARD')
    expect(result).toHaveLength(2)
    expect(result).toContain('high1')
    expect(result).toContain('high2')
  })

  it('HARD + ペアなし → 最高点の1枚を返す', () => {
    const hand = [
      makeCard(3, 'hearts', 'c1'),
      makeCard(10, 'spades', 'c2'),
      makeCard(5, 'clubs', 'c3'),
    ]
    const result = decideDiscard(hand, 'HARD')
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('c2')
  })

  it('HARD + ジョーカーは最後に捨てる（最高点が非ジョーカー）', () => {
    const hand = [
      makeJoker('joker-1'),
      makeCard(8, 'hearts', 'high'),
      makeCard(2, 'clubs', 'low'),
    ]
    const result = decideDiscard(hand, 'HARD')
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('high')
  })

  it('HARD + ジョーカーのみの手札 → ジョーカーを返す', () => {
    const hand = [makeJoker('joker-1')]
    const result = decideDiscard(hand, 'HARD')
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('joker-1')
  })

  it('EASY + rng=()=>0 → 0番目のカードを返す', () => {
    const hand = [
      makeCard(5, 'hearts', 'c1'),
      makeCard(8, 'spades', 'c2'),
      makeCard(2, 'clubs', 'c3'),
    ]
    const result = decideDiscard(hand, 'EASY', () => 0)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('c1')
  })

  it('EASY + 1枚手札 → その1枚を返す', () => {
    const hand = [makeCard(5, 'hearts', 'only')]
    const result = decideDiscard(hand, 'EASY')
    expect(result).toEqual(['only'])
  })
})
