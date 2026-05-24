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

/**
 * 捨てた結果、手札が 0 枚にならないことを検証する。
 * ターン終了時に手札 0 枚はゲーム進行上おかしいので必ず 1 枚以上残す。
 * 単数捨て (1 枚) でも特殊操作 (2-3 枚) でも適用する。
 */
export function validateDiscardLeavesHand(
  hand: Card[],
  discardCount: number
): ValidationResult {
  if (hand.length - discardCount < 1) {
    return {
      valid: false,
      code: 'WOULD_EMPTY_HAND',
      message: 'Discard would leave you with no cards in hand',
    }
  }
  return { valid: true }
}

export function validateUnyam(hand: Card[]): ValidationResult {
  if (calculateHandScore(hand) > 5) {
    return { valid: false, code: 'SCORE_TOO_HIGH', message: 'Hand score must be 5 or less to declare Unyam' }
  }
  return { valid: true }
}

export function validateNoDuplicateAction(
  player: PlayerState,
  actionType: 'normal' | 'special'
): ValidationResult {
  // 仕様 2.6節: DRAW→DISCARD順序。DISCARDは DRAW完了後にのみ可能。
  // すでにDISCARDを完了済みなら再度捨てられない。
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
 * 仕様 2.6節: ターンは「DRAW_PHASE（引く/拾う）→ DISCARD_PHASE（捨てる）→ TURN_END」。
 * - まだ引いていない（hasDrawnThisTurn=false）ことが条件。ターン開始時にのみ引ける。
 * - すでに引き終わっている場合は再度引けない。
 */
export function validateDrawPhase(player: PlayerState): ValidationResult {
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
 * DISCARD_PHASE（捨てるフェーズ）の検証。
 * 仕様 2.6節: DRAW完了後にDISCARDフェーズに移行する。
 * - 先に引いている（hasDrawnThisTurn=true）必要がある。
 * - まだ捨てていない（hasDiscardedThisTurn=false）ことが条件。
 */
export function validateDiscardPhase(player: PlayerState): ValidationResult {
  if (!player.hasDrawnThisTurn) {
    return {
      valid: false,
      code: 'MUST_DRAW_FIRST',
      message: 'You must draw before discarding',
    }
  }
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
 * DRAW→DISCARD順序のため、捨札拾いはターン開始時（まだ引いていない状態）に行う。
 * 自分が今捨てたカードを同ターンで拾う状況はDRAW→DISCARD順序では発生しないため、
 * lastDiscardedCardIds によるチェックは不要。捨て札が空でないかのみ検証する。
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
 * ウニャムがまだ宣言されていないことを検証する。
 * 仕様 2.4節: 1ラウンドにつき宣言者は1人のみ（unyamDeclarerId は単数）。
 */
export function validateUnyamNotYetDeclared(state: GameState): ValidationResult {
  if (state.unyamDeclarerId !== null) {
    return {
      valid: false,
      code: 'UNYAMO_ALREADY_DECLARED',
      message: 'Unyam has already been declared this round',
    }
  }
  return { valid: true }
}
