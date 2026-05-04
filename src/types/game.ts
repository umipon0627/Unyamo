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
   * このターンでDRAW（山札 or 捨て札から引く/拾う）を完了したか。
   * 仕様: ターンの流れは「引く（or拾う）→ 捨てる」の順。
   * - false: DRAW_PHASE（山札から引く / 捨て札から拾う）
   * - true:  DISCARD_PHASE（手札から1枚捨てる、または特殊操作で2-3枚捨てる）
   */
  hasDrawnThisTurn: boolean
  /**
   * このターンでDISCARD相当の操作を完了したか（自動操作などで使用）。
   */
  hasActedThisTurn: boolean
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
}
