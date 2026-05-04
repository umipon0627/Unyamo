export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker'

export interface Card {
  suit: Suit
  rank: number // 1-13, joker=0
  id: string   // crypto.randomUUID() 由来のユニークID
  /**
   * 捨て札にあるカードについて、捨てたプレイヤーのID。
   * 山札・手札にあるカード、および直前のプレイヤー判定に不要なカードでは undefined。
   * 「自分が捨てたカードを自分で拾うことを禁止する」ルールで使用する。
   */
  discardedBy?: string
}
