import { describe, it, expect } from 'vitest'
import {
  validateTurn, validatePhase, validateCardExists,
  validateDiscardMultiple, validateUnyamo, validateDrawSource,
  validateDiscardPickup, validateUnyamoNotYetDeclared,
  validateDrawPhase, validateDiscardPhase, validateNoDuplicateAction,
} from '@/game-logic/validation'
import type { GameState, PlayerState } from '@/types/game'
import type { Card } from '@/types/card'

const makeCard = (rank: number, id = `card-${rank}-${Math.random()}`): Card => ({
  id, suit: 'spades', rank,
})

const makePlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  id: 'p1', name: 'p1', hand: [], isConnected: true, lastActiveAt: Date.now(),
  hasDiscardedThisTurn: false, hasDrawnThisTurn: false, hasUsedSpecialAction: false,
  ...overrides,
})

const makeState = (overrides: Partial<GameState> = {}): GameState => ({
  phase: 'PLAYING',
  players: [],
  deck: [makeCard(5)],
  discardPile: [makeCard(3)],
  currentTurnIndex: 0,
  turnOrder: ['player1', 'player2'],
  unyamoDeclarerId: null,
  remainingPlayersAfterDeclare: [],
  hostId: 'player1',
  roomConfig: { maxPlayers: 4, roomName: 'Test', isPrivate: false },
  startedAt: Date.now(),
  lastDiscardedCardIds: [],
  ...overrides,
})

describe('validateTurn', () => {
  it('valid when current player', () => {
    expect(validateTurn(makeState(), 'player1').valid).toBe(true)
  })
  it('invalid when not current player', () => {
    const r = validateTurn(makeState(), 'player2')
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.code).toBe('NOT_YOUR_TURN')
  })
})

describe('validatePhase', () => {
  it('valid in PLAYING phase', () => {
    expect(validatePhase(makeState(), 'DISCARD').valid).toBe(true)
  })
  it('invalid in WAITING phase', () => {
    const r = validatePhase(makeState({ phase: 'WAITING' }), 'DISCARD')
    expect(r.valid).toBe(false)
  })
})

describe('validateCardExists', () => {
  it('valid when card in hand', () => {
    const card = makeCard(5, 'test-id')
    expect(validateCardExists([card], ['test-id']).valid).toBe(true)
  })
  it('invalid when card not in hand', () => {
    expect(validateCardExists([], ['ghost-id']).valid).toBe(false)
  })
})

describe('validateDiscardMultiple', () => {
  it('valid with 2 same rank cards', () => {
    const cards = [makeCard(7), makeCard(7)]
    expect(validateDiscardMultiple(cards).valid).toBe(true)
  })
  it('invalid with different ranks', () => {
    const cards = [makeCard(7), makeCard(8)]
    expect(validateDiscardMultiple(cards).valid).toBe(false)
  })
  it('invalid with 4 cards', () => {
    const cards = [makeCard(7), makeCard(7), makeCard(7), makeCard(7)]
    expect(validateDiscardMultiple(cards).valid).toBe(false)
  })
})

describe('validateUnyamo', () => {
  it('valid when score <= 5', () => {
    expect(validateUnyamo([makeCard(2), makeCard(3)]).valid).toBe(true)
  })
  it('invalid when score > 5', () => {
    expect(validateUnyamo([makeCard(3), makeCard(4)]).valid).toBe(false)
  })
})

describe('validateDrawSource', () => {
  it('invalid when drawing from empty deck', () => {
    const r = validateDrawSource(makeState({ deck: [] }), 'deck')
    expect(r.valid).toBe(false)
  })
  it('invalid when drawing from empty discard', () => {
    const r = validateDrawSource(makeState({ discardPile: [] }), 'discard')
    expect(r.valid).toBe(false)
  })
  it('valid when both piles have cards', () => {
    expect(validateDrawSource(makeState(), 'deck').valid).toBe(true)
    expect(validateDrawSource(makeState(), 'discard').valid).toBe(true)
  })
})

describe('validateDiscardPickup', () => {
  it('invalid when discard pile is empty', () => {
    const r = validateDiscardPickup(makeState({ discardPile: [] }), 'player1')
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.code).toBe('DISCARD_EMPTY')
  })

  it('valid when top card was discarded by another player (lastDiscardedCardIds is empty)', () => {
    // 仕様 2.3節: 捨て札の一番上から1枚引く（自分が捨てたものでなければ拾える）
    const topCard: Card = { id: 'top', suit: 'hearts', rank: 7 }
    const r = validateDiscardPickup(
      makeState({ discardPile: [topCard], lastDiscardedCardIds: [] }),
      'player1'
    )
    expect(r.valid).toBe(true)
  })

  it('invalid when top card was just discarded by current player (lastDiscardedCardIds includes top)', () => {
    // ACTION_PHASE→DRAW_PHASEの順序のため、自分が今捨てたカードは拾えない
    const topCard: Card = { id: 'own-card', suit: 'hearts', rank: 7 }
    const r = validateDiscardPickup(
      makeState({ discardPile: [topCard], lastDiscardedCardIds: ['own-card'] }),
      'player1'
    )
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.code).toBe('CANNOT_PICKUP_OWN_DISCARD')
  })
})

describe('validateUnyamoNotYetDeclared', () => {
  it('valid when no one has declared yet', () => {
    const r = validateUnyamoNotYetDeclared(makeState({ unyamoDeclarerId: null }))
    expect(r.valid).toBe(true)
  })

  it('invalid when another player has already declared', () => {
    const r = validateUnyamoNotYetDeclared(makeState({ unyamoDeclarerId: 'player1' }))
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.code).toBe('UNYAMO_ALREADY_DECLARED')
  })
})

describe('validateDiscardPhase', () => {
  it('valid when player has not discarded yet', () => {
    expect(validateDiscardPhase(makePlayer({ hasDiscardedThisTurn: false })).valid).toBe(true)
  })
  it('invalid when player has already discarded', () => {
    const r = validateDiscardPhase(makePlayer({ hasDiscardedThisTurn: true }))
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.code).toBe('ALREADY_DISCARDED')
  })
})

describe('validateDrawPhase', () => {
  it('invalid when player has not discarded yet (must discard first)', () => {
    const r = validateDrawPhase(makePlayer({ hasDiscardedThisTurn: false, hasDrawnThisTurn: false }))
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.code).toBe('MUST_DISCARD_FIRST')
  })
  it('valid when player has discarded but not drawn', () => {
    expect(validateDrawPhase(makePlayer({ hasDiscardedThisTurn: true, hasDrawnThisTurn: false })).valid).toBe(true)
  })
  it('invalid when player has already drawn', () => {
    const r = validateDrawPhase(makePlayer({ hasDiscardedThisTurn: true, hasDrawnThisTurn: true }))
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.code).toBe('ALREADY_DREW')
  })
})

describe('validateNoDuplicateAction', () => {
  it('valid when player has not discarded', () => {
    expect(validateNoDuplicateAction(makePlayer({ hasDiscardedThisTurn: false }), 'normal').valid).toBe(true)
  })
  it('invalid when player already discarded', () => {
    const r = validateNoDuplicateAction(makePlayer({ hasDiscardedThisTurn: true }), 'normal')
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.code).toBe('ALREADY_ACTED')
  })
  it('invalid for special when special already used', () => {
    const r = validateNoDuplicateAction(makePlayer({ hasUsedSpecialAction: true }), 'special')
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.code).toBe('ALREADY_USED_SPECIAL')
  })
})
