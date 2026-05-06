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
  if (player.hasActedThisTurn) {
    return { valid: false, code: 'ALREADY_ACTED', message: 'Already performed an action this turn' }
  }
  if (actionType === 'special' && player.hasUsedSpecialAction) {
    return { valid: false, code: 'ALREADY_USED_SPECIAL', message: 'Already used special action this turn' }
  }
  return { valid: true }
}

/**
 * DRAW_PHASE（引くフェーズ）の検証。
 * 仕様: ターンの最初に「山札から引く」または「捨て札から拾う」を必ず1回だけ実行する。
 * すでに引き終わっている場合は再度引けない（その後は捨てるフェーズ）。
 */
export function validateDrawPhase(player: PlayerState): ValidationResult {
  if (player.hasDrawnThisTurn) {
    return {
      valid: false,
      code: 'ALREADY_DREW',
      message: 'Already drew a card this turn (now in discard phase)',
    }
  }
  return { valid: true }
}

/**
 * DISCARD_PHASE（捨てるフェーズ）の検証。
 * 仕様: 手札からカードを捨てるには、先に山札 or 捨て札から1枚引いている必要がある。
 */
export function validateDiscardPhase(player: PlayerState): ValidationResult {
  if (!player.hasDrawnThisTurn) {
    return {
      valid: false,
      code: 'MUST_DRAW_FIRST',
      message: 'You must draw a card first before discarding',
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
 * 誰が捨てたかに関係なく、捨て札が空でなければ拾える。
 */
export function validateDiscardPickup(
  state: GameState,
  _playerId: string
): ValidationResult {
  if (state.discardPile.length === 0) {
    return { valid: false, code: 'DISCARD_EMPTY', message: 'Discard pile is empty' }
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
