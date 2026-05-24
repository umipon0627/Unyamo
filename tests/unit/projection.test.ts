import { describe, it, expect } from 'vitest'
import { projectStateForPlayer } from '../../party/projection'
import type { GameState, PlayerState } from '@/types/game'
import type { Card } from '@/types/card'

const makeCard = (rank: number, id = `card-${rank}`): Card => ({ id, suit: 'spades', rank })
const makePlayer = (id: string, hand: Card[], isConnected = true): PlayerState => ({
  id, name: id, hand, isConnected, lastActiveAt: Date.now(),
  hasDiscardedThisTurn: false, hasDrawnThisTurn: false, hasUsedSpecialAction: false,
})

const makeState = (players: PlayerState[]): GameState => ({
  phase: 'PLAYING',
  players,
  deck: [makeCard(5)],
  discardPile: [makeCard(3)],
  currentTurnIndex: 0,
  turnOrder: players.map(p => p.id),
  unyamDeclarerId: null,
  remainingPlayersAfterDeclare: [],
  hostId: players[0]!.id,
  roomConfig: { maxPlayers: 4, roomName: 'Test', isPrivate: false },
  startedAt: Date.now(),
  lastDiscardedCardIds: [],
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

  it('canPickupFromDiscard is true when I have not drawn yet (DRAW_PHASE) and discard pile has a card', () => {
    // 仕様 2.6節: DRAW→DISCARD順序。DRAW_PHASE（まだ引いていない状態）で捨て札から拾える。
    const topCard: Card = { id: 'others-top', suit: 'hearts', rank: 7 }
    const me = { ...makePlayer('me', []), hasDrawnThisTurn: false, hasDiscardedThisTurn: false }
    const state: GameState = {
      ...makeState([me, makePlayer('other', [])]),
      discardPile: [topCard],
      lastDiscardedCardIds: [],
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

  it('canPickupFromDiscard is false when already drew this turn (DISCARD_PHASE)', () => {
    // 仕様 2.6節: DRAW完了後はDISCARD_PHASE。捨て札から拾う機会はDRAW_PHASEのみ。
    const topCard: Card = { id: 'top', suit: 'hearts', rank: 7 }
    const me = { ...makePlayer('me', []), hasDrawnThisTurn: true, hasDiscardedThisTurn: false }
    const state: GameState = {
      ...makeState([me, makePlayer('other', [])]),
      discardPile: [topCard],
    }
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.canPickupFromDiscard).toBe(false)
  })

  it('DECLARE_UNYAMO is not in availableActions when someone has already declared', () => {
    // 仕様 2.4節: 1ラウンドにつき宣言者は1人のみ。
    const myHand = [makeCard(1)] // 1点 → canDeclareUnyam=true
    const state: GameState = {
      ...makeState([makePlayer('me', myHand), makePlayer('other', [])]),
      unyamDeclarerId: 'other',
    }
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.availableActions).not.toContain('DECLARE_UNYAMO')
    expect(projected.canDeclareUnyam).toBe(false)
  })

  it('availableActions in DRAW_PHASE: DRAW (no DISCARD/DISCARD_MULTIPLE)', () => {
    // 仕様 2.6節: ターン開始はDRAW_PHASE。まず引く。
    const myHand = [makeCard(7), makeCard(7)]
    const state: GameState = {
      ...makeState([makePlayer('me', myHand), makePlayer('other', [])]),
    }
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.availableActions).toContain('DRAW')
    expect(projected.availableActions).not.toContain('DISCARD')
    expect(projected.availableActions).not.toContain('DISCARD_MULTIPLE')
  })

  it('availableActions in DISCARD_PHASE: DISCARD/DISCARD_MULTIPLE only (no DRAW)', () => {
    // 仕様 2.6節: DRAW完了後はDISCARD_PHASE。捨てる。
    const myHand = [makeCard(7), makeCard(7)]
    const me = { ...makePlayer('me', myHand), hasDrawnThisTurn: true, hasDiscardedThisTurn: false }
    const state: GameState = {
      ...makeState([me, makePlayer('other', [])]),
    }
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.availableActions).toContain('DISCARD')
    expect(projected.availableActions).toContain('DISCARD_MULTIPLE')
    expect(projected.availableActions).not.toContain('DRAW')
    expect(projected.availableActions).not.toContain('DECLARE_UNYAMO')
  })

  it('DECLARE_UNYAMO available in DRAW_PHASE only (not after drawing)', () => {
    // ウニャム宣言はターン開始時（まだ引いていない時）のみ可能
    const myHand = [makeCard(1)] // 1点
    const meDiscardPhase = { ...makePlayer('me', myHand), hasDrawnThisTurn: true }
    const state: GameState = {
      ...makeState([meDiscardPhase, makePlayer('other', [])]),
    }
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.availableActions).not.toContain('DECLARE_UNYAMO')
  })
})
