import { describe, it, expect } from 'vitest'
import { projectStateForPlayer } from '../../party/projection'
import type { GameState, PlayerState } from '@/types/game'
import type { Card } from '@/types/card'

const makeCard = (rank: number, id = `card-${rank}`): Card => ({ id, suit: 'spades', rank })
const makePlayer = (id: string, hand: Card[], isConnected = true): PlayerState => ({
  id, name: id, hand, isConnected, lastActiveAt: Date.now(),
  hasActedThisTurn: false, hasUsedSpecialAction: false,
})

const makeState = (players: PlayerState[]): GameState => ({
  phase: 'PLAYING',
  players,
  deck: [makeCard(5)],
  discardPile: [makeCard(3)],
  currentTurnIndex: 0,
  turnOrder: players.map(p => p.id),
  unyamoDeclarerId: null,
  remainingPlayersAfterDeclare: [],
  hostId: players[0]!.id,
  roomConfig: { maxPlayers: 4, roomName: 'Test', isPrivate: false },
  startedAt: Date.now(),
})

describe('projectStateForPlayer', () => {
  it('includes only own hand cards', () => {
    const myHand = [makeCard(1, 'my-card')]
    const othersHand = [makeCard(13, 'secret-card')]
    const state = makeState([makePlayer('me', myHand), makePlayer('other', othersHand)])
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.myHand).toHaveLength(1)
    expect(projected.myHand[0]!.id).toBe('my-card')
    // 他プレイヤーの手札が含まれないこと
    expect(JSON.stringify(projected)).not.toContain('secret-card')
  })
  it('shows other players as cardCount only', () => {
    const state = makeState([makePlayer('me', [makeCard(1)]), makePlayer('other', [makeCard(2), makeCard(3)])])
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.otherPlayers[0]!.cardCount).toBe(2)
    expect((projected.otherPlayers[0] as unknown as Record<string, unknown>)['hand']).toBeUndefined()
  })
  it('shows only top of discard pile', () => {
    const state = makeState([makePlayer('me', [])])
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.discardPileTop?.rank).toBe(3)
  })
})
