import type { GameState } from '../src/types/game'
import type { ClientGameStatePayload } from './messages'
import { calculateHandScore } from '../src/game-logic/scoring'
import { canDeclareUnyamo } from '../src/game-logic/unyamo'
import { escapeHtml } from './utils'

export function projectStateForPlayer(
  state: GameState,
  playerId: string
): ClientGameStatePayload {
  const me = state.players.find(p => p.id === playerId)
  const myHand = me?.hand ?? []

  const availableActions: string[] = []
  const currentPlayerId = state.turnOrder[state.currentTurnIndex]
  // 仕様 2.6節: ターンの流れは [ウニャモ宣言 or DISCARD] → DRAW → ターン終了。
  // ウニャモ宣言はターン開始時（まだ何もしていない時）にのみ可能で、
  // すでに誰かが宣言済みなら不可。
  if (currentPlayerId === playerId && state.phase === 'PLAYING') {
    if (!me?.hasDiscardedThisTurn) {
      // ACTION_PHASE: 1枚捨てる / 特殊操作で2-3枚捨てる / ウニャモ宣言
      availableActions.push('DISCARD')
      if (!me?.hasUsedSpecialAction) availableActions.push('DISCARD_MULTIPLE')
      if (canDeclareUnyamo(myHand) && state.unyamoDeclarerId === null) {
        availableActions.push('DECLARE_UNYAMO')
      }
    } else if (!me?.hasDrawnThisTurn) {
      // DRAW_PHASE: 山札から引く / 捨て札から拾う
      availableActions.push('DRAW')
    }
  }

  const canStartGame =
    state.phase === 'WAITING' &&
    state.players.length >= 2 &&
    playerId === state.hostId

  // 仕様 2.3節: 捨て札の一番上から1枚引く。
  // ただしDISCARD→DRAWの順序のため、自分が今捨てたカードは拾えない。
  const discardTop = state.discardPile[state.discardPile.length - 1] ?? null
  const isOwnLastDiscard =
    !!discardTop && state.lastDiscardedCardIds.includes(discardTop.id)
  const canPickupFromDiscard =
    !!discardTop &&
    !!me?.hasDiscardedThisTurn &&
    !me?.hasDrawnThisTurn &&
    !isOwnLastDiscard &&
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
    canDeclareUnyamo: canDeclareUnyamo(myHand) && state.unyamoDeclarerId === null,
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
