import type { GameState } from '../src/types/game'
import type { ClientGameStatePayload } from './messages'
import { calculateHandScore } from '../src/game-logic/scoring'
import { canDeclareUnyam } from '../src/game-logic/unyam'
import { escapeHtml } from './utils'

export function projectStateForPlayer(
  state: GameState,
  playerId: string
): ClientGameStatePayload {
  const me = state.players.find(p => p.id === playerId)
  const myHand = me?.hand ?? []

  const availableActions: string[] = []
  const currentPlayerId = state.turnOrder[state.currentTurnIndex]
  // 仕様 2.6節: ターンの流れは [ウニャム宣言 or DRAW] → DISCARD → ターン終了。
  // ウニャム宣言はターン開始時（まだ引いていない時）にのみ可能で、
  // すでに誰かが宣言済みなら不可。
  if (currentPlayerId === playerId && state.phase === 'PLAYING') {
    if (!me?.hasDrawnThisTurn) {
      // DRAW_PHASE: 山札から引く / 捨て札から拾う / ウニャム宣言
      availableActions.push('DRAW')
      if (canDeclareUnyam(myHand) && state.unyamDeclarerId === null) {
        availableActions.push('DECLARE_UNYAMO')
      }
    } else if (!me?.hasDiscardedThisTurn) {
      // DISCARD_PHASE: 1枚捨てる / 特殊操作で2-3枚捨てる
      availableActions.push('DISCARD')
      if (!me?.hasUsedSpecialAction) availableActions.push('DISCARD_MULTIPLE')
    }
  }

  const canStartGame =
    state.phase === 'WAITING' &&
    state.players.length >= 2 &&
    playerId === state.hostId

  // 仕様 2.3節: 捨て札の一番上から1枚引く。
  // DRAW→DISCARD順序のため、捨て札拾いはDRAW_PHASE（まだ引いていない状態）に行う。
  // 自分が今捨てたカードを同ターンで拾う状況はDRAW→DISCARD順序では発生しない。
  const discardTop = state.discardPile[state.discardPile.length - 1] ?? null
  const canPickupFromDiscard =
    !!discardTop &&
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
    canDeclareUnyam: canDeclareUnyam(myHand) && state.unyamDeclarerId === null,
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
