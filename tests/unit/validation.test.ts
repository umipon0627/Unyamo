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

  it('valid when discard pile has cards (DRAW→DISCARD順序では自分が捨てたカードを同ターンで拾う状況は発生しない)', () => {
    // 仕様 2.3節: DRAW→DISCARD順序では、ターン開始時（引く前）に捨て札を拾う。
    // 自分が今捨てたカードを同ターンで拾う状況は起きないため、lastDiscardedCardIdsチェックは不要。
    const topCard: Card = { id: 'top', suit: 'hearts', rank: 7 }
    const r = validateDiscardPickup(
      makeState({ discardPile: [topCard], lastDiscardedCardIds: [] }),
      'player1'
    )
    expect(r.valid).toBe(true)
  })

  it('valid even when lastDiscardedCardIds contains the top card (DRAW→DISCARD順序では制約不要)', () => {
    // DRAW→DISCARD順序では、引く前に捨て札から拾う。
    // lastDiscardedCardIdsは前のターンのデータであり、このターンでの制約には使わない。
    const topCard: Card = { id: 'prev-turn-card', suit: 'hearts', rank: 7 }
    const r = validateDiscardPickup(
      makeState({ discardPile: [topCard], lastDiscardedCardIds: ['prev-turn-card'] }),
      'player1'
    )
    expect(r.valid).toBe(true)
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
  it('invalid when player has not drawn yet (must draw first)', () => {
    // 仕様 2.6節: DRAW→DISCARD順序。引く前には捨てられない。
    const r = validateDiscardPhase(makePlayer({ hasDrawnThisTurn: false, hasDiscardedThisTurn: false }))
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.code).toBe('MUST_DRAW_FIRST')
  })
  it('valid when player has drawn but not discarded yet', () => {
    // 仕様 2.6節: DRAW完了後にDISCARD可能。
    expect(validateDiscardPhase(makePlayer({ hasDrawnThisTurn: true, hasDiscardedThisTurn: false })).valid).toBe(true)
  })
  it('invalid when player has already discarded', () => {
    const r = validateDiscardPhase(makePlayer({ hasDrawnThisTurn: true, hasDiscardedThisTurn: true }))
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.code).toBe('ALREADY_DISCARDED')
  })
})

describe('validateDrawPhase', () => {
  it('valid when player has not drawn yet (ターン開始時)', () => {
    // 仕様 2.6節: DRAW→DISCARD順序。ターン開始時に引ける。
    const r = validateDrawPhase(makePlayer({ hasDrawnThisTurn: false }))
    expect(r.valid).toBe(true)
  })
  it('invalid when player has already drawn', () => {
    const r = validateDrawPhase(makePlayer({ hasDrawnThisTurn: true }))
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
