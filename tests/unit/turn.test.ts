import { describe, it, expect } from 'vitest'
import { getCurrentPlayerId, advanceTurn, isRoundComplete, initializeTurnOrder, getPreviousPlayerId } from '@/game-logic/turn'
import type { GameState, PlayerState } from '@/types/game'
import type { Card } from '@/types/card'

const makePlayer = (id: string, isConnected = true): PlayerState => ({
  id, name: id, hand: [], isConnected, lastActiveAt: Date.now(),
  hasDiscardedThisTurn: false, hasDrawnThisTurn: false, hasUsedSpecialAction: false,
})

const makeState = (overrides: Partial<GameState> = {}): GameState => ({
  phase: 'PLAYING',
  players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')],
  deck: [],
  discardPile: [],
  currentTurnIndex: 0,
  turnOrder: ['p1', 'p2', 'p3'],
  unyamoDeclarerId: null,
  remainingPlayersAfterDeclare: [],
  hostId: 'p1',
  roomConfig: { maxPlayers: 4, roomName: 'Test', isPrivate: false },
  startedAt: Date.now(),
  lastDiscardedCardIds: [],
  ...overrides,
})

describe('getCurrentPlayerId', () => {
  it('returns current player id', () => {
    expect(getCurrentPlayerId(makeState())).toBe('p1')
    expect(getCurrentPlayerId(makeState({ currentTurnIndex: 1 }))).toBe('p2')
  })
})

describe('advanceTurn', () => {
  it('advances to next player', () => {
    const next = advanceTurn(makeState())
    expect(getCurrentPlayerId(next)).toBe('p2')
  })
  it('wraps around to first player', () => {
    const next = advanceTurn(makeState({ currentTurnIndex: 2 }))
    expect(getCurrentPlayerId(next)).toBe('p1')
  })
  it('resets hasDiscardedThisTurn and hasDrawnThisTurn for all players', () => {
    const state = makeState()
    state.players[0]!.hasDiscardedThisTurn = true
    state.players[0]!.hasDrawnThisTurn = true
    const next = advanceTurn(state)
    expect(next.players.every(p => !p.hasDiscardedThisTurn)).toBe(true)
    expect(next.players.every(p => !p.hasDrawnThisTurn)).toBe(true)
  })
  it('clears lastDiscardedCardIds', () => {
    const state = makeState({ lastDiscardedCardIds: ['c1', 'c2'] })
    const next = advanceTurn(state)
    expect(next.lastDiscardedCardIds).toEqual([])
  })
  it('skips disconnected players', () => {
    const state = makeState({
      players: [makePlayer('p1'), makePlayer('p2', false), makePlayer('p3')],
    })
    const next = advanceTurn(state) // p1→skip p2→p3
    expect(getCurrentPlayerId(next)).toBe('p3')
  })
})

describe('isRoundComplete', () => {
  it('false when no unyamo declared', () => {
    expect(isRoundComplete(makeState())).toBe(false)
  })
  it('true when declarer set and remaining empty', () => {
    const state = makeState({ unyamoDeclarerId: 'p1', remainingPlayersAfterDeclare: [] })
    expect(isRoundComplete(state)).toBe(true)
  })
  it('false when remaining players exist', () => {
    const state = makeState({ unyamoDeclarerId: 'p1', remainingPlayersAfterDeclare: ['p2'] })
    expect(isRoundComplete(state)).toBe(false)
  })
})

describe('getPreviousPlayerId', () => {
  it('returns empty string for single player', () => {
    const state = makeState({
      turnOrder: ['p1'],
      players: [makePlayer('p1')],
    })
    expect(getPreviousPlayerId(state)).toBe('')
  })

  it('returns p3 when currentTurnIndex=0 (wraps around)', () => {
    // turnOrder=['p1','p2','p3'], current=p1 → prev=p3
    expect(getPreviousPlayerId(makeState({ currentTurnIndex: 0 }))).toBe('p3')
  })

  it('returns p1 when currentTurnIndex=1', () => {
    expect(getPreviousPlayerId(makeState({ currentTurnIndex: 1 }))).toBe('p1')
  })

  it('returns p2 when currentTurnIndex=2', () => {
    expect(getPreviousPlayerId(makeState({ currentTurnIndex: 2 }))).toBe('p2')
  })

  it('skips disconnected player (p3 disconnected, currentTurnIndex=0 → wraps to p2)', () => {
    // turnOrder=['p1','p2','p3'], current=p1; p3 is disconnected → skip p3 → prev=p2
    const state = makeState({
      currentTurnIndex: 0,
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3', false)],
    })
    expect(getPreviousPlayerId(state)).toBe('p2')
  })

  it('skips disconnected player (p2 disconnected, currentTurnIndex=2 → wraps to p1)', () => {
    // turnOrder=['p1','p2','p3'], current=p3; p2 is disconnected → skip p2 → prev=p1
    const state = makeState({
      currentTurnIndex: 2,
      players: [makePlayer('p1'), makePlayer('p2', false), makePlayer('p3')],
    })
    expect(getPreviousPlayerId(state)).toBe('p1')
  })
})
