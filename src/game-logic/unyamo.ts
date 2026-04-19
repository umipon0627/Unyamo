import type { Card } from '@/types/card'
import { calculateHandScore } from './scoring'

export function canDeclareUnyamo(hand: Card[]): boolean {
  return calculateHandScore(hand) <= 5
}

export interface JudgeResult {
  playerId: string
  totalScore: number
  rank: number
  declared: boolean
  isWinner: boolean
}

export function judgeWinner(
  players: { id: string; hand: Card[] }[],
  declarerId: string
): JudgeResult[] {
  const scores = players.map(p => ({
    id: p.id,
    score: calculateHandScore(p.hand),
    declared: p.id === declarerId,
  }))

  const declarer = scores.find(p => p.id === declarerId)
  if (!declarer) throw new Error('Declarer not found')

  const declarerScore = declarer.score
  const othersWithLowerOrEqual = scores
    .filter(p => p.id !== declarerId)
    .some(p => p.score <= declarerScore)

  if (othersWithLowerOrEqual) {
    // 宣言者は最下位（仕様2.5節: 同点でも宣言者が最下位）
    const others = scores.filter(p => p.id !== declarerId)
    const sortedOthers = [...others].sort((a, b) => a.score - b.score)
    const results: JudgeResult[] = sortedOthers.map(p => {
      const rank = sortedOthers.findIndex(o => o.score === p.score) + 1
      return { playerId: p.id, totalScore: p.score, rank, declared: false, isWinner: rank === 1 && !othersWithLowerOrEqual }
    })
    const declarerRank = players.length
    results.push({
      playerId: declarerId,
      totalScore: declarerScore,
      rank: declarerRank,
      declared: true,
      isWinner: false,
    })
    return results
  } else {
    // 宣言者の勝利
    return scores.map(p => ({
      playerId: p.id,
      totalScore: p.score,
      rank: p.id === declarerId ? 1 : 2,
      declared: p.id === declarerId,
      isWinner: p.id === declarerId,
    }))
  }
}
