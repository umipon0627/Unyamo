import type { Card } from './card'
import type { RoomConfig } from './room'

export type GamePhase = 'WAITING' | 'DEALING' | 'PLAYING' | 'JUDGING' | 'RESULT'

export interface PlayerState {
  id: string
  name: string
  hand: Card[]
  isConnected: boolean
  lastActiveAt: number
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
