import type { Card } from '@/types/card'
import type { GameState, PlayerState } from '@/types/game'
import { calculateHandScore } from './scoring'

export type ValidationResult =
  | { valid: true }
  | { valid: false; code: string; message: string }

export function validateTurn(state: GameState, playerId: string): ValidationResult {
  const currentId = state.turnOrder[state.currentTurnIndex]
  if (currentId !== playerId) {
    return { valid: false, code: 'NOT_YOUR_TURN', message: 'It is not your turn' }
  }
  return { valid: true }
}

export function validatePhase(state: GameState, action: string): ValidationResult {
  if (state.phase !== 'PLAYING') {
    return { valid: false, code: 'WRONG_PHASE', message: `Action ${action} not allowed in phase ${state.phase}` }
  }
  return { valid: true }
}

export function validateCardExists(hand: Card[], cardIds: string[]): ValidationResult {
  for (const cardId of cardIds) {
    if (!hand.some(c => c.id === cardId)) {
      return { valid: false, code: 'CARD_NOT_IN_HAND', message: `Card ${cardId} not in hand` }
    }
  }
  return { valid: true }
}

export function validateDiscardMultiple(cards: Card[]): ValidationResult {
  if (cards.length < 2 || cards.length > 3) {
    return { valid: false, code: 'INVALID_CARD_COUNT', message: 'Must discard 2 or 3 cards' }
  }
  const nonJokers = cards.filter(c => c.suit !== 'joker')
  if (nonJokers.length === 0) {
    return { valid: false, code: 'INVALID_DISCARD', message: 'Cannot discard jokers only' }
  }
  const firstRank = nonJokers[0]!.rank
  if (!nonJokers.every(c => c.rank === firstRank)) {
    return { valid: false, code: 'RANK_MISMATCH', message: 'All cards must have the same rank' }
  }
  return { valid: true }
}

export function validateUnyamo(hand: Card[]): ValidationResult {
  if (calculateHandScore(hand) > 5) {
    return { valid: false, code: 'SCORE_TOO_HIGH', message: 'Hand score must be 5 or less to declare Unyamo' }
  }
  return { valid: true }
}

export function validateNoDuplicateAction(
  player: PlayerState,
  actionType: 'normal' | 'special'
): ValidationResult {
  if (player.hasDiscardedThisTurn) {
    return { valid: false, code: 'ALREADY_ACTED', message: 'Already performed an action this turn' }
  }
  if (actionType === 'special' && player.hasUsedSpecialAction) {
    return { valid: false, code: 'ALREADY_USED_SPECIAL', message: 'Already used special action this turn' }
  }
  return { valid: true }
}

/**
 * DRAW_PHASE（引くフェーズ）の検証。
 * 仕様 2.6節: ターンは「ACTION_PHASE（捨てる）→ DRAW_PHASE（引く/拾う）→ TURN_END」。
 * - 先に手札を捨てている（hasDiscardedThisTurn=true）必要がある。
 * - すでに引き終わっている場合は再度引けない。
 */
export function validateDrawPhase(player: PlayerState): ValidationResult {
  if (!player.hasDiscardedThisTurn) {
    return {
      valid: false,
      code: 'MUST_DISCARD_FIRST',
      message: 'You must discard before drawing',
    }
  }
  if (player.hasDrawnThisTurn) {
    return {
      valid: false,
      code: 'ALREADY_DREW',
      message: 'Already drew a card this turn',
    }
  }
  return { valid: true }
}

/**
 * DISCARD_PHASE（捨てるフェーズ = ACTION_PHASE）の検証。
 * 仕様 2.6節: ターン開始時の最初のフェーズ。まだ捨てていないことが条件。
 */
export function validateDiscardPhase(player: PlayerState): ValidationResult {
  if (player.hasDiscardedThisTurn) {
    return {
      valid: false,
      code: 'ALREADY_DISCARDED',
      message: 'Already discarded this turn',
    }
  }
  return { valid: true }
}

export function validateDrawSource(
  state: GameState,
  source: 'deck' | 'discard'
): ValidationResult {
  if (source === 'deck' && state.deck.length === 0) {
    return { valid: false, code: 'DECK_EMPTY', message: 'Deck is empty' }
  }
  if (source === 'discard' && state.discardPile.length === 0) {
    return { valid: false, code: 'DISCARD_EMPTY', message: 'Discard pile is empty' }
  }
  return { valid: true }
}

/**
 * 捨て札の一番上から拾えるかを検証する。
 * 仕様 2.3節: 「山札または捨て札の一番上から1枚引く」のみ。
 * ただし: ACTION_PHASE→DRAW_PHASEの順序のため、
 * 「自分が今ACTION_PHASEで捨てたカードを直後に拾い直す」は禁止する。
 * （state.lastDiscardedCardIds に含まれるIDは現ターンプレイヤー自身が捨てたカード）
 */
export function validateDiscardPickup(
  state: GameState,
  _playerId: string
): ValidationResult {
  if (state.discardPile.length === 0) {
    return { valid: false, code: 'DISCARD_EMPTY', message: 'Discard pile is empty' }
  }
  const top = state.discardPile[state.discardPile.length - 1]
  if (top && state.lastDiscardedCardIds.includes(top.id)) {
    return {
      valid: false,
      code: 'CANNOT_PICKUP_OWN_DISCARD',
      message: 'You cannot pick up the card you just discarded',
    }
  }
  return { valid: true }
}

/**
 * ウニャモがまだ宣言されていないことを検証する。
 * 仕様 2.4節: 1ラウンドにつき宣言者は1人のみ（unyamoDeclarerId は単数）。
 */
export function validateUnyamoNotYetDeclared(state: GameState): ValidationResult {
  if (state.unyamoDeclarerId !== null) {
    return {
      valid: false,
      code: 'UNYAMO_ALREADY_DECLARED',
      message: 'Unyamo has already been declared this round',
    }
  }
  return { valid: true }
}
