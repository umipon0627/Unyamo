import { describe, it, expect } from 'vitest'
import { getCurrentPlayerId, advanceTurn, isRoundComplete, initializeTurnOrder } from '@/game-logic/turn'
import type { GameState, PlayerState } from '@/types/game'
import type { Card } from '@/types/card'

const makePlayer = (id: string, isConnected = true): PlayerState => ({
  id, name: id, hand: [], isConnected, lastActiveAt: Date.now(),
  hasActedThisTurn: false, hasUsedSpecialAction: false,
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
  it('resets hasActedThisTurn for all players', () => {
    const state = makeState()
    state.players[0]!.hasActedThisTurn = true
    const next = advanceTurn(state)
    expect(next.players.every(p => !p.hasActedThisTurn)).toBe(true)
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
