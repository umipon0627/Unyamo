import { describe, it, expect } from 'vitest'
import {
  validateTurn, validatePhase, validateCardExists,
  validateDiscardMultiple, validateUnyamo, validateDrawSource,
  validateDiscardPickup, validateUnyamoNotYetDeclared,
} from '@/game-logic/validation'
import type { GameState } from '@/types/game'
import type { Card } from '@/types/card'

const makeCard = (rank: number, id = `card-${rank}-${Math.random()}`): Card => ({
  id, suit: 'spades', rank,
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

  it('valid when discard pile has at least one card (regardless of who discarded it)', () => {
    // 仕様 2.3節: 「捨て札の一番上から1枚引く」のみ。誰が捨てたかは関係ない。
    const topCard: Card = { id: 'top', suit: 'hearts', rank: 7 }
    const r = validateDiscardPickup(makeState({ discardPile: [topCard] }), 'player1')
    expect(r.valid).toBe(true)
  })

  it('valid even when current player themselves discarded the top card', () => {
    // 「自分が捨てたカードを自分で拾えない」という制限は仕様外。
    const topCard: Card = { id: 'own', suit: 'hearts', rank: 7 }
    const r = validateDiscardPickup(makeState({ discardPile: [topCard] }), 'player1')
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
