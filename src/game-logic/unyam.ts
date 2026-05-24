import type { Card } from '@/types/card'
import { calculateHandScore } from './scoring'

export function canDeclareUnyam(hand: Card[]): boolean {
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
  const others = scores.filter(p => p.id !== declarerId)
  const othersWithLowerOrEqual = others.some(p => p.score <= declarerScore)
  // 非宣言者は点数昇順で順位付け（同点は同順位）
  const sortedOthers = [...others].sort((a, b) => a.score - b.score)

  if (othersWithLowerOrEqual) {
    // 宣言者は最下位（仕様2.5節: 同点でも宣言者が最下位）。
    // 非宣言者は点数昇順で1位から並べ、最小点のプレイヤーが勝者。
    const results: JudgeResult[] = sortedOthers.map(p => {
      const rank = sortedOthers.findIndex(o => o.score === p.score) + 1
      return { playerId: p.id, totalScore: p.score, rank, declared: false, isWinner: rank === 1 }
    })
    results.push({
      playerId: declarerId,
      totalScore: declarerScore,
      rank: players.length,
      declared: true,
      isWinner: false,
    })
    return results
  } else {
    // 宣言者の勝利（単独最小）。宣言者=1位・勝者。
    // 非宣言者は点数昇順で2位以降に並べる（同点は同順位）。
    const results: JudgeResult[] = sortedOthers.map(p => {
      const rank = sortedOthers.findIndex(o => o.score === p.score) + 2
      return { playerId: p.id, totalScore: p.score, rank, declared: false, isWinner: false }
    })
    results.push({
      playerId: declarerId,
      totalScore: declarerScore,
      rank: 1,
      declared: true,
      isWinner: true,
    })
    return results
  }
}
