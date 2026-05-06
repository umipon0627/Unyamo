import { describe, it, expect } from 'vitest'
import { projectStateForPlayer } from '../../party/projection'
import type { GameState, PlayerState } from '@/types/game'
import type { Card } from '@/types/card'

const makeCard = (rank: number, id = `card-${rank}`): Card => ({ id, suit: 'spades', rank })
const makePlayer = (id: string, hand: Card[], isConnected = true): PlayerState => ({
  id, name: id, hand, isConnected, lastActiveAt: Date.now(),
  hasDrawnThisTurn: false, hasActedThisTurn: false, hasUsedSpecialAction: false,
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

  it('canPickupFromDiscard is true when discard pile has any card on my turn (regardless of who discarded)', () => {
    // 仕様 2.3節: 捨て札の一番上から1枚引く。誰が捨てたかは関係ない。
    const topCard: Card = { id: 'top', suit: 'hearts', rank: 7 }
    const state: GameState = {
      ...makeState([makePlayer('me', []), makePlayer('other', [])]),
      discardPile: [topCard],
    }
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.canPickupFromDiscard).toBe(true)
  })

  it('canPickupFromDiscard is false when discard pile is empty', () => {
    const state: GameState = {
      ...makeState([makePlayer('me', [])]),
      discardPile: [],
    }
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.canPickupFromDiscard).toBe(false)
  })

  it('canPickupFromDiscard is false when not my turn', () => {
    const topCard: Card = { id: 'top', suit: 'hearts', rank: 7 }
    const state: GameState = {
      ...makeState([makePlayer('me', []), makePlayer('other', [])]),
      discardPile: [topCard],
      currentTurnIndex: 1, // other's turn
    }
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.canPickupFromDiscard).toBe(false)
  })

  it('canPickupFromDiscard is false when already drew this turn', () => {
    const topCard: Card = { id: 'top', suit: 'hearts', rank: 7 }
    const me = { ...makePlayer('me', []), hasDrawnThisTurn: true }
    const state: GameState = {
      ...makeState([me, makePlayer('other', [])]),
      discardPile: [topCard],
    }
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.canPickupFromDiscard).toBe(false)
  })

  it('DECLARE_UNYAMO is not in availableActions when someone has already declared', () => {
    // 仕様 2.4節: 1ラウンドにつき宣言者は1人のみ。
    const myHand = [makeCard(1)] // 1点 → canDeclareUnyamo=true
    const state: GameState = {
      ...makeState([makePlayer('me', myHand), makePlayer('other', [])]),
      unyamoDeclarerId: 'other',
    }
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.availableActions).not.toContain('DECLARE_UNYAMO')
    expect(projected.canDeclareUnyamo).toBe(false)
  })
})
