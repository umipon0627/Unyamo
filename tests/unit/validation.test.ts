import { describe, it, expect } from 'vitest'
import {
  validateTurn, validatePhase, validateCardExists,
  validateDiscardMultiple, validateUnyamo, validateNoDuplicateAction, validateDrawSource,
  validateDiscardPickup
} from '@/game-logic/validation'
import type { GameState, PlayerState } from '@/types/game'
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

// validateDiscardPickup テスト用ヘルパー
// turnOrder: ['player1', 'player2'], currentTurnIndex: 0 → currentPlayer=player1, prev=player2
const makePlayerState = (id: string, isConnected = true) => ({
  id, name: id, hand: [] as Card[], isConnected, lastActiveAt: Date.now(),
  hasDrawnThisTurn: false, hasActedThisTurn: false, hasUsedSpecialAction: false,
})

describe('validateDiscardPickup', () => {
  it('invalid when discard pile is empty', () => {
    const r = validateDiscardPickup(makeState({ discardPile: [] }), 'player1')
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.code).toBe('DISCARD_EMPTY')
  })

  it('valid when top was discarded by the previous player (player2 → player1 acts)', () => {
    // turnOrder=['player1','player2'], currentTurnIndex=0 → prev=player2
    const prevDiscard: Card = { id: 'prev', suit: 'hearts', rank: 7, discardedBy: 'player2' }
    const state = makeState({
      discardPile: [prevDiscard],
      players: [makePlayerState('player1'), makePlayerState('player2')],
    })
    const r = validateDiscardPickup(state, 'player1')
    expect(r.valid).toBe(true)
  })

  it('invalid when top was discarded by a player 2 turns ago (3-player game)', () => {
    // turnOrder=['p1','p2','p3'], currentTurnIndex=2 → current=p3, prev=p2
    // discardedBy='p1' (2手前) → invalid
    const twoTurnsAgoDiscard: Card = { id: 'old', suit: 'spades', rank: 5, discardedBy: 'p1' }
    const state = makeState({
      turnOrder: ['p1', 'p2', 'p3'],
      currentTurnIndex: 2,
      discardPile: [twoTurnsAgoDiscard],
      players: [makePlayerState('p1'), makePlayerState('p2'), makePlayerState('p3')],
    })
    const r = validateDiscardPickup(state, 'p3')
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.code).toBe('NOT_PREVIOUS_PLAYER_DISCARD')
  })

  it('invalid when top has no discardedBy', () => {
    const noOwnerDiscard: Card = { id: 'noowner', suit: 'hearts', rank: 7 }
    const r = validateDiscardPickup(makeState({ discardPile: [noOwnerDiscard] }), 'player1')
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.code).toBe('NOT_PREVIOUS_PLAYER_DISCARD')
  })

  it('invalid when top was discarded by current player themselves', () => {
    // currentTurnIndex=0 → current=player1, prev=player2; discardedBy=player1 → invalid
    const ownDiscard: Card = { id: 'own', suit: 'hearts', rank: 7, discardedBy: 'player1' }
    const state = makeState({
      discardPile: [ownDiscard],
      players: [makePlayerState('player1'), makePlayerState('player2')],
    })
    const r = validateDiscardPickup(state, 'player1')
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.code).toBe('NOT_PREVIOUS_PLAYER_DISCARD')
  })

  it('skips disconnected previous player to find the next connected one', () => {
    // turnOrder=['p1','p2','p3'], currentTurnIndex=0 → current=p1
    // p3 is disconnected → prev should skip p3 and resolve to p2
    // discardedBy='p2' → valid
    const prevDiscard: Card = { id: 'skip', suit: 'clubs', rank: 4, discardedBy: 'p2' }
    const state = makeState({
      turnOrder: ['p1', 'p2', 'p3'],
      currentTurnIndex: 0,
      discardPile: [prevDiscard],
      players: [makePlayerState('p1'), makePlayerState('p2'), makePlayerState('p3', false)],
    })
    const r = validateDiscardPickup(state, 'p1')
    expect(r.valid).toBe(true)
  })
})
