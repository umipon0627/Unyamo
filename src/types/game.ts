export type GamePhase = 'WAITING' | 'DEALING' | 'PLAYING' | 'JUDGING' | 'RESULT'

export interface PlayerState {
  id: string
  name: string
  hand: import('./card').Card[]
  isConnected: boolean
  lastActiveAt: number
  hasActedThisTurn: boolean
}

export interface GameState {
  phase: GamePhase
  players: PlayerState[]
  deck: import('./card').Card[]
  discardPile: import('./card').Card[]
  currentTurnIndex: number
  turnOrder: string[]
  unyamoDeclarerId: string | null
  remainingPlayersAfterDeclare: string[]
  hostId: string
  roomConfig: import('./room').RoomConfig
  startedAt: number | null
}
