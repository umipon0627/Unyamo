import type { GameState } from '../src/types/game'
import type { ClientGameStatePayload } from './messages'
import { calculateHandScore } from '../src/game-logic/scoring'
import { canDeclareUnyamo } from '../src/game-logic/unyamo'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function projectStateForPlayer(
  state: GameState,
  playerId: string
): ClientGameStatePayload {
  const me = state.players.find(p => p.id === playerId)
  const myHand = me?.hand ?? []

  const availableActions: string[] = []
  const currentPlayerId = state.turnOrder[state.currentTurnIndex]
  if (currentPlayerId === playerId && state.phase === 'PLAYING') {
    if (!me?.hasActedThisTurn) {
      availableActions.push('DISCARD')
      if (!me?.hasUsedSpecialAction) availableActions.push('DISCARD_MULTIPLE')
      if (canDeclareUnyamo(myHand)) availableActions.push('DECLARE_UNYAMO')
    } else {
      availableActions.push('DRAW')
    }
  }

  return {
    phase: state.phase,
    myHand,
    otherPlayers: state.players
      .filter(p => p.id !== playerId)
      .map(p => ({
        id: p.id,
        name: escapeHtml(p.name),
        cardCount: p.hand.length,
        isConnected: p.isConnected,
      })),
    discardPileTop: state.discardPile[state.discardPile.length - 1] ?? null,
    deckCount: state.deck.length,
    currentTurnPlayerId: currentPlayerId ?? '',
    myTotalScore: calculateHandScore(myHand),
    canDeclareUnyamo: canDeclareUnyamo(myHand),
    availableActions,
  }
}
