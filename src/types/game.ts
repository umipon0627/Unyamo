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
   * このターンでDRAW（山札/捨て札から引く）を完了したか。
   * 仕様 2.6節: ターンの流れは「DRAW_PHASE（引く/拾う）→ DISCARD_PHASE（捨てる）→ TURN_END」。
   * - false: DRAW_PHASE（山札から引く / 捨て札から拾う）またはウニャモ宣言フェーズ
   * - true:  DISCARD_PHASE（手札から1枚捨てる、または特殊操作で2-3枚捨てる）
   */
  hasDrawnThisTurn: boolean
  /**
   * このターンでDISCARD（手札からカードを捨てる/特殊操作で複数捨てる）を完了したか。
   * DISCARD完了 → ターン終了・次プレイヤーへ。
   */
  hasDiscardedThisTurn: boolean
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
   * このフィールドはDRAW→DISCARD順序では実質使用しない。
   * DRAW→DISCARDの順序では自分が捨てたカードを同ターンで拾う状況が発生しないため、
   * 「自分が今捨てたカードを直後に拾う」制約は不要になった。
   * 後方互換のため型定義は維持。advanceTurnでクリアされる。
   */
  lastDiscardedCardIds: string[]
}
