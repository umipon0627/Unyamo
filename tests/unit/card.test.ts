import { describe, it, expect } from 'vitest'
import { getCardScore } from '@/game-logic/scoring'
import type { Card } from '@/types/card'

describe('getCardScore', () => {
  it('ジョーカーは0点', () => {
    const joker: Card = { id: 'joker-1', suit: 'joker', rank: 0 }
    expect(getCardScore(joker)).toBe(0)
  })

  it('エースは1点', () => {
    const ace: Card = { id: 'hearts-1', suit: 'hearts', rank: 1 }
    expect(getCardScore(ace)).toBe(1)
  })

  it('10は10点', () => {
    const ten: Card = { id: 'spades-10', suit: 'spades', rank: 10 }
    expect(getCardScore(ten)).toBe(10)
  })

  it('Jは11点', () => {
    const jack: Card = { id: 'clubs-11', suit: 'clubs', rank: 11 }
    expect(getCardScore(jack)).toBe(11)
  })

  it('Qは12点', () => {
    const queen: Card = { id: 'diamonds-12', suit: 'diamonds', rank: 12 }
    expect(getCardScore(queen)).toBe(12)
  })

  it('Kは13点', () => {
    const king: Card = { id: 'hearts-13', suit: 'hearts', rank: 13 }
    expect(getCardScore(king)).toBe(13)
  })
})
