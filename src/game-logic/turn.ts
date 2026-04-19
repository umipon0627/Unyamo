import type { GameState } from '@/types/game'

export function getCurrentPlayerId(state: GameState): string {
  return state.turnOrder[state.currentTurnIndex] ?? ''
}

export function initializeTurnOrder(playerIds: string[]): string[] {
  const order = [...playerIds]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = order[i]!
    order[i] = order[j]!
    order[j] = temp
  }
  return order
}

export function advanceTurn(state: GameState): GameState {
  const playerCount = state.turnOrder.length
  let nextIndex = (state.currentTurnIndex + 1) % playerCount
  // 切断プレイヤーをスキップ（最大1周）
  let attempts = 0
  while (attempts < playerCount) {
    const nextPlayerId = state.turnOrder[nextIndex]
    const player = state.players.find(p => p.id === nextPlayerId)
    if (player?.isConnected) break
    nextIndex = (nextIndex + 1) % playerCount
    attempts++
  }
  const updatedPlayers = state.players.map(p => ({
    ...p,
    hasActedThisTurn: false,
    hasUsedSpecialAction: false,
  }))
  return { ...state, currentTurnIndex: nextIndex, players: updatedPlayers }
}

export function isRoundComplete(state: GameState): boolean {
  if (!state.unyamoDeclarerId) return false
  return state.remainingPlayersAfterDeclare.length === 0
}
