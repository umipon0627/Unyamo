import type { Card } from './card'
import type { RoomConfig } from './room'

export type GamePhase = 'WAITING' | 'DEALING' | 'PLAYING' | 'JUDGING' | 'RESULT'

export interface PlayerState {
  id: string
  name: string
  hand: Card[]
  isConnected: boolean
  lastActiveAt: number
  /**
   * このターンでDISCARD（手札からカードを捨てる/特殊操作で複数捨てる）を完了したか。
   * 仕様 2.6節: ターンの流れは「ACTION_PHASE（捨てる）→ DRAW_PHASE（引く/拾う）→ TURN_END」。
   * - false: DISCARD_PHASE（手札から1枚捨てる、または特殊操作で2-3枚捨てる）
   * - true:  DRAW_PHASE（山札から引く / 捨て札から拾う）
   */
  hasDiscardedThisTurn: boolean
  /**
   * このターンでDRAW（引く/拾う）相当の操作を完了したか（自動操作などで使用）。
   */
  hasDrawnThisTurn: boolean
  hasUsedSpecialAction: boolean // 1ターン中1回の特殊操作制限用
}

export interface GameState {
  phase: GamePhase
  players: PlayerState[]
  deck: Card[]
  discardPile: Card[]
  currentTurnIndex: number
  turnOrder: string[]
  unyamoDeclarerId: string | null
  remainingPlayersAfterDeclare: string[]
  hostId: string
  roomConfig: RoomConfig
  startedAt: number | null
  /**
   * 「現在のターンプレイヤーが、このターンのACTION_PHASEで捨てたカードのID」一覧。
   * DRAW_PHASEで「自分が今捨てたカードを再度拾えない」制約に使う。
   * advanceTurnでクリアされる。
   */
  lastDiscardedCardIds: string[]
}
