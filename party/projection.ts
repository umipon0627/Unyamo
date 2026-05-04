import type { GameState } from '../src/types/game'
import type { ClientGameStatePayload } from './messages'
import { calculateHandScore } from '../src/game-logic/scoring'
import { canDeclareUnyamo } from '../src/game-logic/unyamo'
import { getPreviousPlayerId } from '../src/game-logic/turn'

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
  // ウニャモ宣言はターンの最初（DRAWの前）にのみ可能。
  // ターンの流れ: [ウニャモ宣言 or DRAW] → DISCARD → ターン終了
  if (currentPlayerId === playerId && state.phase === 'PLAYING') {
    if (!me?.hasDrawnThisTurn) {
      // DRAW_PHASE: 山札から引く / 捨て札から拾う / ウニャモ宣言
      availableActions.push('DRAW')
      if (canDeclareUnyamo(myHand)) availableActions.push('DECLARE_UNYAMO')
    } else if (!me?.hasActedThisTurn) {
      // DISCARD_PHASE: 1枚捨てる / 特殊操作で2-3枚捨てる
      availableActions.push('DISCARD')
      if (!me?.hasUsedSpecialAction) availableActions.push('DISCARD_MULTIPLE')
    }
  }

  const canStartGame =
    state.phase === 'WAITING' &&
    state.players.length >= 2 &&
    playerId === state.hostId

  const discardTop = state.discardPile[state.discardPile.length - 1] ?? null
  const prevPlayerId = getPreviousPlayerId(state)
  const canPickupFromDiscard =
    !!discardTop &&
    !!prevPlayerId &&
    discardTop.discardedBy === prevPlayerId &&
    !me?.hasDrawnThisTurn &&
    currentPlayerId === playerId &&
    state.phase === 'PLAYING'

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
    discardPileTop: discardTop,
    canPickupFromDiscard,
    deckCount: state.deck.length,
    currentTurnPlayerId: currentPlayerId ?? '',
    myTotalScore: calculateHandScore(myHand),
    canDeclareUnyamo: canDeclareUnyamo(myHand),
    availableActions,
    hostId: state.hostId,
    maxPlayers: state.roomConfig.maxPlayers,
    roomName: escapeHtml(state.roomConfig.roomName),
    players: state.players.map(p => ({
      id: p.id,
      name: escapeHtml(p.name),
      isConnected: p.isConnected,
    })),
    canStartGame,
  }
}
