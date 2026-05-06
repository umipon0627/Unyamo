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
  unyamoDeclarerId: null,
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

  it('canPickupFromDiscard is true when I have discarded but not drawn (DRAW_PHASE) and top is not my own', () => {
    // 仕様 2.6節: ACTION_PHASE→DRAW_PHASE。DISCARD完了後、自分以外の捨て札なら拾える。
    const topCard: Card = { id: 'others-top', suit: 'hearts', rank: 7 }
    const me = { ...makePlayer('me', []), hasDiscardedThisTurn: true, hasDrawnThisTurn: false }
    const state: GameState = {
      ...makeState([me, makePlayer('other', [])]),
      discardPile: [topCard],
      lastDiscardedCardIds: [], // 今ターンで自分はまだ何も捨てていない or 別カードを捨てた前提
    }
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.canPickupFromDiscard).toBe(true)
  })

  it('canPickupFromDiscard is false when discard pile is empty', () => {
    const state: GameState = {
      ...makeState([{ ...makePlayer('me', []), hasDiscardedThisTurn: true }]),
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

  it('canPickupFromDiscard is false when I have not discarded yet (still in ACTION_PHASE)', () => {
    const topCard: Card = { id: 'top', suit: 'hearts', rank: 7 }
    const me = { ...makePlayer('me', []), hasDiscardedThisTurn: false }
    const state: GameState = {
      ...makeState([me, makePlayer('other', [])]),
      discardPile: [topCard],
    }
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.canPickupFromDiscard).toBe(false)
  })

  it('canPickupFromDiscard is false when already drew this turn', () => {
    const topCard: Card = { id: 'top', suit: 'hearts', rank: 7 }
    const me = { ...makePlayer('me', []), hasDiscardedThisTurn: true, hasDrawnThisTurn: true }
    const state: GameState = {
      ...makeState([me, makePlayer('other', [])]),
      discardPile: [topCard],
    }
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.canPickupFromDiscard).toBe(false)
  })

  it('canPickupFromDiscard is false when top of discard is the card I just discarded', () => {
    // 仕様: ACTION_PHASE で自分が捨てたばかりのカードは DRAW_PHASE で拾えない
    const topCard: Card = { id: 'my-card', suit: 'hearts', rank: 7 }
    const me = { ...makePlayer('me', []), hasDiscardedThisTurn: true, hasDrawnThisTurn: false }
    const state: GameState = {
      ...makeState([me, makePlayer('other', [])]),
      discardPile: [topCard],
      lastDiscardedCardIds: ['my-card'],
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

  it('availableActions in ACTION_PHASE: DISCARD/DISCARD_MULTIPLE (no DRAW)', () => {
    // 仕様 2.6節: ターン開始は ACTION_PHASE。
    const myHand = [makeCard(7), makeCard(7)]
    const state: GameState = {
      ...makeState([makePlayer('me', myHand), makePlayer('other', [])]),
    }
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.availableActions).toContain('DISCARD')
    expect(projected.availableActions).toContain('DISCARD_MULTIPLE')
    expect(projected.availableActions).not.toContain('DRAW')
  })

  it('availableActions in DRAW_PHASE: DRAW only (no DISCARD)', () => {
    // 仕様 2.6節: DISCARD完了後は DRAW_PHASE。
    const myHand = [makeCard(7)]
    const me = { ...makePlayer('me', myHand), hasDiscardedThisTurn: true, hasDrawnThisTurn: false }
    const state: GameState = {
      ...makeState([me, makePlayer('other', [])]),
    }
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.availableActions).toContain('DRAW')
    expect(projected.availableActions).not.toContain('DISCARD')
    expect(projected.availableActions).not.toContain('DISCARD_MULTIPLE')
    expect(projected.availableActions).not.toContain('DECLARE_UNYAMO')
  })

  it('DECLARE_UNYAMO available in ACTION_PHASE only (not in DRAW_PHASE)', () => {
    // ウニャモ宣言はターン開始時のみ可能（DISCARD前）
    const myHand = [makeCard(1)] // 1点
    const meDrawPhase = { ...makePlayer('me', myHand), hasDiscardedThisTurn: true }
    const state: GameState = {
      ...makeState([meDrawPhase, makePlayer('other', [])]),
    }
    const projected = projectStateForPlayer(state, 'me')
    expect(projected.availableActions).not.toContain('DECLARE_UNYAMO')
  })
})
