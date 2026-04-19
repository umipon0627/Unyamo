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
