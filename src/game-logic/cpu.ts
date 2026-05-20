import type { Card } from '@/types/card'
import { calculateHandScore, getCardScore } from './scoring'

export type CpuDifficulty = 'EASY' | 'HARD'

/**
 * ウニャモ宣言するかを判定する純粋関数。
 * EASY: 手札合計5点以下なら rng()<0.5 で true
 * HARD: 手札合計5点以下なら必ず true
 */
export function decideUnyamoDeclaration(
  hand: Card[],
  difficulty: CpuDifficulty,
  rng: () => number = Math.random
): boolean {
  const score = calculateHandScore(hand)
  if (score > 5) return false
  if (difficulty === 'HARD') return true
  // EASY: 50%の確率で宣言
  return rng() < 0.5
}

/**
 * 山札 or 捨て札のどちらから引くかを決定する純粋関数。
 * canPickupFromDiscard=false なら必ず 'deck'
 * EASY: canPickupFromDiscard=true なら rng()<0.5 で 'discard'
 * HARD: canPickupFromDiscard=true かつ discardTop.rank < 手札最高点 なら 'discard'
 */
export function decideDrawSource(
  hand: Card[],
  discardTop: Card | null,
  canPickupFromDiscard: boolean,
  difficulty: CpuDifficulty,
  rng: () => number = Math.random
): 'deck' | 'discard' {
  if (!canPickupFromDiscard || !discardTop) return 'deck'

  if (difficulty === 'EASY') {
    return rng() < 0.5 ? 'discard' : 'deck'
  }

  // HARD: 捨て札が手札の最高点カードより低ければ拾う（入れ替えが有利）
  const maxHandScore = Math.max(...hand.map(c => getCardScore(c)), 0)
  const discardScore = getCardScore(discardTop)
  return discardScore < maxHandScore ? 'discard' : 'deck'
}

/**
 * 手札のどのカードを捨てるかを決定する純粋関数。
 * EASY: ランダムに1枚 → [cardId]
 * HARD: 同数字の組があれば特殊操作（最高点グループ優先）、なければ最高点1枚
 *       ジョーカー(rank=0)の捨て優先度は最低
 * 戻り値: [cardId] or [id1,id2] or [id1,id2,id3]
 */
export function decideDiscard(
  hand: Card[],
  difficulty: CpuDifficulty,
  rng: () => number = Math.random
): string[] {
  if (hand.length === 0) return []

  if (difficulty === 'EASY') {
    const index = Math.floor(rng() * hand.length)
    const card = hand[index]
    return card ? [card.id] : [hand[0]!.id]
  }

  // HARD: 同数字グループを探す（ジョーカーはグループ対象外）
  const nonJokers = hand.filter(c => c.suit !== 'joker')
  const rankGroups = new Map<number, Card[]>()
  for (const card of nonJokers) {
    const group = rankGroups.get(card.rank) ?? []
    group.push(card)
    rankGroups.set(card.rank, group)
  }

  // 2枚以上のグループ（特殊操作可能）を取得
  const validGroups: Card[][] = []
  for (const group of rankGroups.values()) {
    if (group.length >= 2) validGroups.push(group)
  }

  // 手札を 0 枚にしないために、特殊操作で捨てられる枚数は最大 hand.length - 1。
  // (DISCARD_MULTIPLE は最低2枚必要)
  const maxSpecialDiscard = Math.min(3, hand.length - 1)

  if (validGroups.length > 0 && maxSpecialDiscard >= 2) {
    // グループの合計点が最も高いものを選ぶ（ジョーカーを含む場合でも数字のみで比較）
    const bestGroup = validGroups.reduce((best, group) => {
      const bestScore = best.reduce((s, c) => s + getCardScore(c), 0)
      const groupScore = group.reduce((s, c) => s + getCardScore(c), 0)
      return groupScore > bestScore ? group : best
    }, validGroups[0]!)

    // 上限を maxSpecialDiscard でクランプ（手札を 0 枚にしない）
    const toDiscard = bestGroup.slice(0, maxSpecialDiscard)
    if (toDiscard.length >= 2) return toDiscard.map(c => c.id)
    // フォールスルー: 2枚未満になる場合は単数捨てへ
  }

  // グループなし: 最高点の1枚を捨てる（ジョーカーは最低優先度）
  const sorted = [...hand].sort((a, b) => {
    const scoreA = getCardScore(a)
    const scoreB = getCardScore(b)
    return scoreB - scoreA
  })

  // ジョーカーを末尾に（スコア0は既にソート末尾だが、ジョーカーをより明示的に後回し）
  const nonJokerSorted = sorted.filter(c => c.suit !== 'joker')
  const jokerSorted = sorted.filter(c => c.suit === 'joker')
  const finalSorted = [...nonJokerSorted, ...jokerSorted]

  return [finalSorted[0]!.id]
}
