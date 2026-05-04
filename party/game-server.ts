import type * as Party from 'partykit/server'
import type { GameState, PlayerState } from '../src/types/game'
import type { Card } from '../src/types/card'
import type { ClientMessage, ServerMessage } from './messages'
import { clientMessageSchema } from './messages'
import { verifyToken } from './auth'
import { projectStateForPlayer } from './projection'
import { createDeck, shuffleDeck, dealCards, drawFromDeck, drawFromDiscardPile } from '../src/game-logic/deck'
import { initializeTurnOrder, advanceTurn, getCurrentPlayerId, isRoundComplete } from '../src/game-logic/turn'
import {
  validateTurn, validatePhase, validateCardExists,
  validateDiscardMultiple, validateUnyamo, validateNoDuplicateAction, validateDrawSource,
  validateDiscardPickup, validateDrawPhase, validateDiscardPhase
} from '../src/game-logic/validation'
import { judgeWinner } from '../src/game-logic/unyamo'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function send(conn: Party.Connection, msg: ServerMessage): void {
  conn.send(JSON.stringify(msg))
}

const TURN_TIMEOUT_MS = 30_000
const RECONNECT_TIMEOUT_MS = 5 * 60_000
const ROOM_DESTROY_TIMEOUT_MS = 30 * 60_000

export default class GameServer implements Party.Server {
  gameState: GameState | null = null
  connections = new Map<string, { userId: string; name: string }>()
  turnTimer: ReturnType<typeof setTimeout> | null = null
  disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()
  roomDestroyTimer: ReturnType<typeof setTimeout> | null = null
  lastMessageAt = new Map<string, number>()

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    // 接続確立のみ。JOINメッセージを待つ
  }

  async onMessage(message: string, sender: Party.Connection) {
    // レート制限: 1秒1回
    const now = Date.now()
    const last = this.lastMessageAt.get(sender.id) ?? 0
    if (now - last < 1000) {
      send(sender, { type: 'ERROR', payload: { code: 'RATE_LIMITED', message: 'Too many messages' } })
      return
    }
    this.lastMessageAt.set(sender.id, now)

    const parsed = clientMessageSchema.safeParse(JSON.parse(message))
    if (!parsed.success) {
      send(sender, { type: 'ERROR', payload: { code: 'INVALID_MESSAGE', message: 'Invalid message format' } })
      return
    }

    const msg = parsed.data
    switch (msg.type) {
      case 'JOIN': return this.handleJoin(sender, msg.payload.token)
      case 'START_GAME': return this.handleStartGame(sender)
      case 'DISCARD': return this.handleDiscard(sender, msg.payload.cardId)
      case 'DISCARD_MULTIPLE': return this.handleDiscardMultiple(sender, msg.payload.cardIds)
      case 'DRAW': return this.handleDraw(sender, msg.payload.source)
      case 'DECLARE_UNYAMO': return this.handleDeclareUnyamo(sender)
      case 'RECONNECT': return this.handleReconnect(sender, msg.payload.token)
    }
  }

  onClose(conn: Party.Connection) {
    const info = this.connections.get(conn.id)
    if (!info || !this.gameState) return

    this.gameState = {
      ...this.gameState,
      players: this.gameState.players.map(p =>
        p.id === info.userId ? { ...p, isConnected: false } : p
      ),
    }
    this.broadcastMessage({ type: 'PLAYER_STATUS', payload: { playerId: info.userId, isConnected: false } })

    const timer = setTimeout(() => {
      if (!this.gameState) return
      this.gameState = {
        ...this.gameState,
        players: this.gameState.players.filter(p => p.id !== info.userId),
        turnOrder: this.gameState.turnOrder.filter(id => id !== info.userId),
      }
      this.disconnectTimers.delete(info.userId)
      this.broadcastGameState()

      // 全員切断チェック
      const connected = this.gameState.players.filter(p => p.isConnected)
      if (connected.length === 0) {
        this.roomDestroyTimer = setTimeout(() => { /* room cleanup */ }, ROOM_DESTROY_TIMEOUT_MS)
      }
    }, RECONNECT_TIMEOUT_MS)

    this.disconnectTimers.set(info.userId, timer)
  }

  private async handleJoin(conn: Party.Connection, token: string) {
    // PartyKit では環境変数は room.env 経由でのみ取得可能（process.env では空になる）。
    // AUTH_SECRET / NEXTAUTH_SECRET のどちらかにフォールバック。
    const env = this.room.env
    const rawSecret = env['AUTH_SECRET'] ?? env['NEXTAUTH_SECRET']
    const secret = typeof rawSecret === 'string' ? rawSecret : undefined
    const identity = await verifyToken(token, secret)
    if (!identity) {
      send(conn, { type: 'ERROR', payload: { code: 'UNAUTHORIZED', message: 'Invalid token' } })
      conn.close()
      return
    }

    if (!this.gameState) {
      this.gameState = {
        phase: 'WAITING',
        players: [],
        deck: [],
        discardPile: [],
        currentTurnIndex: 0,
        turnOrder: [],
        unyamoDeclarerId: null,
        remainingPlayersAfterDeclare: [],
        hostId: identity.userId,
        roomConfig: { maxPlayers: 8, roomName: escapeHtml(this.room.id), isPrivate: false },
        startedAt: null,
      }
    }

    // 再接続チェック
    const existingPlayer = this.gameState.players.find(p => p.id === identity.userId)
    if (existingPlayer) {
      const oldTimer = this.disconnectTimers.get(identity.userId)
      if (oldTimer) { clearTimeout(oldTimer); this.disconnectTimers.delete(identity.userId) }
      this.gameState = {
        ...this.gameState,
        players: this.gameState.players.map(p =>
          p.id === identity.userId ? { ...p, isConnected: true, lastActiveAt: Date.now() } : p
        ),
      }
      this.connections.set(conn.id, { userId: identity.userId, name: identity.name })
      this.broadcastMessage({ type: 'PLAYER_STATUS', payload: { playerId: identity.userId, isConnected: true } })
      this.sendGameState(conn, identity.userId)
      return
    }

    if (this.gameState.phase !== 'WAITING') {
      send(conn, { type: 'ERROR', payload: { code: 'GAME_IN_PROGRESS', message: 'Game already started' } })
      conn.close()
      return
    }
    if (this.gameState.players.length >= this.gameState.roomConfig.maxPlayers) {
      send(conn, { type: 'ERROR', payload: { code: 'ROOM_FULL', message: 'Room is full' } })
      conn.close()
      return
    }

    const newPlayer: PlayerState = {
      id: identity.userId,
      name: escapeHtml(identity.name),
      hand: [],
      isConnected: true,
      lastActiveAt: Date.now(),
      hasDrawnThisTurn: false,
      hasActedThisTurn: false,
      hasUsedSpecialAction: false,
    }
    this.gameState = { ...this.gameState, players: [...this.gameState.players, newPlayer] }
    this.connections.set(conn.id, { userId: identity.userId, name: identity.name })
    this.broadcastGameState()
  }

  private handleStartGame(conn: Party.Connection) {
    const info = this.connections.get(conn.id)
    if (!info || !this.gameState) return
    if (info.userId !== this.gameState.hostId) {
      send(conn, { type: 'ERROR', payload: { code: 'NOT_HOST', message: 'Only host can start the game' } })
      return
    }
    if (this.gameState.players.length < 2) {
      send(conn, { type: 'ERROR', payload: { code: 'NOT_ENOUGH_PLAYERS', message: 'Need at least 2 players' } })
      return
    }

    const deck = shuffleDeck(createDeck())
    const { hands, remainingDeck } = dealCards(deck, this.gameState.players.length)
    const turnOrder = initializeTurnOrder(this.gameState.players.map(p => p.id))

    this.gameState = {
      ...this.gameState,
      phase: 'PLAYING',
      deck: remainingDeck,
      discardPile: [],
      players: this.gameState.players.map((p, i) => ({ ...p, hand: hands[i] ?? [] })),
      turnOrder,
      currentTurnIndex: 0,
      startedAt: Date.now(),
    }
    this.broadcastGameState()
    this.scheduleTurnTimeout()
  }

  private handleDiscard(conn: Party.Connection, cardId: string) {
    const info = this.connections.get(conn.id)
    if (!info || !this.gameState) return

    const player = this.gameState.players.find(p => p.id === info.userId)
    if (!player) return

    const checks = [
      validatePhase(this.gameState, 'DISCARD'),
      validateTurn(this.gameState, info.userId),
      validateDiscardPhase(player), // 先にDRAWしている必要がある
      validateNoDuplicateAction(player, 'normal'),
      validateCardExists(player.hand, [cardId]),
    ]
    for (const r of checks) {
      if (!r.valid) {
        send(conn, { type: 'ACTION_RESULT', payload: { success: false, action: 'DISCARD', playerId: info.userId, error: r.code } })
        return
      }
    }

    const card = player.hand.find(c => c.id === cardId)!
    const discardedCard: Card = { ...card, discardedBy: info.userId }
    this.gameState = {
      ...this.gameState,
      discardPile: [...this.gameState.discardPile, discardedCard],
      players: this.gameState.players.map(p =>
        p.id === info.userId
          ? { ...p, hand: p.hand.filter(c => c.id !== cardId), hasActedThisTurn: true, lastActiveAt: Date.now() }
          : p
      ),
    }
    send(conn, { type: 'ACTION_RESULT', payload: { success: true, action: 'DISCARD', playerId: info.userId } })

    // DISCARDでターン終了 → 次プレイヤーへ
    this.advanceAfterDiscard(info.userId)
  }

  private handleDiscardMultiple(conn: Party.Connection, cardIds: string[]) {
    const info = this.connections.get(conn.id)
    if (!info || !this.gameState) return

    const player = this.gameState.players.find(p => p.id === info.userId)
    if (!player) return

    const selectedCards = player.hand.filter(c => cardIds.includes(c.id))
    const checks = [
      validatePhase(this.gameState, 'DISCARD_MULTIPLE'),
      validateTurn(this.gameState, info.userId),
      validateDiscardPhase(player), // 先にDRAWしている必要がある
      validateNoDuplicateAction(player, 'special'),
      validateCardExists(player.hand, cardIds),
      validateDiscardMultiple(selectedCards),
    ]
    for (const r of checks) {
      if (!r.valid) {
        send(conn, { type: 'ACTION_RESULT', payload: { success: false, action: 'DISCARD_MULTIPLE', playerId: info.userId, error: r.code } })
        return
      }
    }

    const discardedCards: Card[] = selectedCards.map(c => ({ ...c, discardedBy: info.userId }))
    this.gameState = {
      ...this.gameState,
      discardPile: [...this.gameState.discardPile, ...discardedCards],
      players: this.gameState.players.map(p =>
        p.id === info.userId
          ? { ...p, hand: p.hand.filter(c => !cardIds.includes(c.id)), hasActedThisTurn: true, hasUsedSpecialAction: true, lastActiveAt: Date.now() }
          : p
      ),
    }
    send(conn, { type: 'ACTION_RESULT', payload: { success: true, action: 'DISCARD_MULTIPLE', playerId: info.userId } })

    // DISCARD_MULTIPLEでターン終了 → 次プレイヤーへ
    this.advanceAfterDiscard(info.userId)
  }

  private handleDraw(conn: Party.Connection, source: 'deck' | 'discard') {
    const info = this.connections.get(conn.id)
    if (!info || !this.gameState) return

    const player = this.gameState.players.find(p => p.id === info.userId)
    if (!player) return

    const checks = [
      validatePhase(this.gameState, 'DRAW'),
      validateTurn(this.gameState, info.userId),
      validateDrawPhase(player), // まだ引いていないこと
      validateDrawSource(this.gameState, source),
      ...(source === 'discard' ? [validateDiscardPickup(this.gameState, info.userId)] : []),
    ]
    for (const r of checks) {
      if (!r.valid) {
        send(conn, { type: 'ACTION_RESULT', payload: { success: false, action: 'DRAW', playerId: info.userId, error: r.code } })
        return
      }
    }

    let drawnCard: Card | null = null
    if (source === 'deck') {
      const { card, remainingDeck } = drawFromDeck(this.gameState.deck)
      drawnCard = card
      this.gameState = { ...this.gameState, deck: remainingDeck }
    } else {
      const { card, remainingPile } = drawFromDiscardPile(this.gameState.discardPile)
      // 拾ったカードからは discardedBy を除去（手札に戻すため）
      drawnCard = card ? { ...card, discardedBy: undefined } : null
      this.gameState = { ...this.gameState, discardPile: remainingPile }
    }

    if (!drawnCard) return

    this.gameState = {
      ...this.gameState,
      players: this.gameState.players.map(p =>
        p.id === info.userId
          ? { ...p, hand: [...p.hand, drawnCard!], hasDrawnThisTurn: true, lastActiveAt: Date.now() }
          : p
      ),
    }

    send(conn, { type: 'ACTION_RESULT', payload: { success: true, action: 'DRAW', playerId: info.userId } })
    // DRAWではターンを進めない。次は同じプレイヤーがDISCARDフェーズへ。
    this.broadcastGameState()
    // タイマーは継続（同一ターン内のDISCARD待ち）
  }

  /**
   * DISCARD / DISCARD_MULTIPLE 完了後にターンを進める共通処理。
   * - ウニャモ宣言中は remainingPlayersAfterDeclare を更新
   * - ラウンド完了なら finalizeGame
   * - そうでなければ advanceTurn して次のプレイヤーへ
   */
  private advanceAfterDiscard(actorId: string) {
    if (!this.gameState) return
    this.cancelTurnTimeout()

    if (this.gameState.unyamoDeclarerId) {
      this.gameState = {
        ...this.gameState,
        remainingPlayersAfterDeclare: this.gameState.remainingPlayersAfterDeclare.filter(id => id !== actorId),
      }
    }

    if (isRoundComplete(this.gameState)) {
      this.finalizeGame()
      return
    }

    this.gameState = advanceTurn(this.gameState)
    this.broadcastMessage({ type: 'TURN_CHANGE', payload: { currentPlayerId: getCurrentPlayerId(this.gameState) } })
    this.broadcastGameState()
    this.scheduleTurnTimeout()
  }

  private handleDeclareUnyamo(conn: Party.Connection) {
    const info = this.connections.get(conn.id)
    if (!info || !this.gameState) return

    const player = this.gameState.players.find(p => p.id === info.userId)
    if (!player) return

    const checks = [
      validatePhase(this.gameState, 'DECLARE_UNYAMO'),
      validateTurn(this.gameState, info.userId),
      validateUnyamo(player.hand),
    ]
    for (const r of checks) {
      if (!r.valid) {
        send(conn, { type: 'ACTION_RESULT', payload: { success: false, action: 'DECLARE_UNYAMO', playerId: info.userId, error: r.code } })
        return
      }
    }

    const remainingPlayers = this.gameState.turnOrder.filter(id => id !== info.userId)
    this.gameState = {
      ...this.gameState,
      unyamoDeclarerId: info.userId,
      remainingPlayersAfterDeclare: remainingPlayers,
    }

    this.broadcastMessage({ type: 'UNYAMO_DECLARED', payload: { playerId: info.userId, playerName: player.name } })

    if (isRoundComplete(this.gameState)) {
      this.finalizeGame()
      return
    }

    this.gameState = advanceTurn(this.gameState)
    this.broadcastMessage({ type: 'TURN_CHANGE', payload: { currentPlayerId: getCurrentPlayerId(this.gameState) } })
    this.broadcastGameState()
    this.scheduleTurnTimeout()
  }

  private async handleReconnect(conn: Party.Connection, token: string) {
    await this.handleJoin(conn, token) // JOINハンドラが再接続も処理する
  }

  private finalizeGame() {
    if (!this.gameState) return
    this.cancelTurnTimeout()
    this.gameState = { ...this.gameState, phase: 'JUDGING' }

    const declarerId = this.gameState.unyamoDeclarerId!
    const results = judgeWinner(
      this.gameState.players.map(p => ({ id: p.id, hand: p.hand })),
      declarerId
    )

    this.gameState = { ...this.gameState, phase: 'RESULT' }

    const gameResultPayload = results.map(r => {
      const player = this.gameState!.players.find(p => p.id === r.playerId)!
      return {
        playerId: r.playerId,
        playerName: player.name,
        hand: player.hand,
        totalScore: r.totalScore,
        rank: r.rank,
        declared: r.declared,
        isWinner: r.isWinner,
      }
    })
    this.broadcastMessage({ type: 'GAME_RESULT', payload: { results: gameResultPayload } })
    this.broadcastGameState()

    // ゲスト以外のプレイヤーが1人でもいればDB保存を試みる
    const hasRegisteredPlayer = results.some(r => !r.playerId.startsWith('guest:'))
    if (hasRegisteredPlayer) {
      const baseUrl = (this.room.env['NEXTAUTH_URL'] as string | undefined) ?? 'http://localhost:3000'
      const secret = this.room.env['INTERNAL_API_SECRET'] as string | undefined
      if (secret) {
        fetch(`${baseUrl}/api/games/result`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
          body: JSON.stringify({
            roomId: this.room.id,
            startedAt: this.gameState.startedAt ?? Date.now(),
            results: results.map(r => ({
              playerId: r.playerId,
              totalScore: r.totalScore,
              rank: r.rank,
              declared: r.declared,
              isWinner: r.isWinner,
            })),
          }),
        }).catch(() => {}) // 失敗してもゲームは終了済みなので無視
      }
    }
  }

  private scheduleTurnTimeout() {
    this.cancelTurnTimeout()
    if (!this.gameState) return
    const currentPlayerId = getCurrentPlayerId(this.gameState)
    this.turnTimer = setTimeout(() => {
      if (!this.gameState) return
      const player = this.gameState.players.find(p => p.id === currentPlayerId)
      if (!player) return

      // 自動操作（仕様: 引く→捨てる）。
      // まだ引いていない場合は山札から1枚引く。
      if (!player.hasDrawnThisTurn) {
        const { card, remainingDeck } = drawFromDeck(this.gameState.deck)
        if (card) {
          this.gameState = {
            ...this.gameState,
            deck: remainingDeck,
            players: this.gameState.players.map(p =>
              p.id === currentPlayerId
                ? { ...p, hand: [...p.hand, card], hasDrawnThisTurn: true }
                : p
            ),
          }
        }
      }

      // 次に最大点カードを捨てる。
      const updatedPlayer = this.gameState.players.find(p => p.id === currentPlayerId)
      if (!updatedPlayer || updatedPlayer.hand.length === 0) {
        // 引けず手札も空（山札枯渇）→ ターンだけ進める
        this.advanceAfterDiscard(currentPlayerId)
        return
      }
      const maxCard = updatedPlayer.hand.reduce((max, c) => {
        const score = c.suit === 'joker' ? 0 : c.rank
        const maxScore = max.suit === 'joker' ? 0 : max.rank
        return score > maxScore ? c : max
      }, updatedPlayer.hand[0]!)
      const autoDiscarded: Card = { ...maxCard, discardedBy: currentPlayerId }
      this.gameState = {
        ...this.gameState,
        discardPile: [...this.gameState.discardPile, autoDiscarded],
        players: this.gameState.players.map(p =>
          p.id === currentPlayerId
            ? { ...p, hand: p.hand.filter(c => c.id !== maxCard.id), hasActedThisTurn: true }
            : p
        ),
      }

      this.advanceAfterDiscard(currentPlayerId)
    }, TURN_TIMEOUT_MS)
  }

  private cancelTurnTimeout() {
    if (this.turnTimer) { clearTimeout(this.turnTimer); this.turnTimer = null }
  }

  private sendGameState(conn: Party.Connection, userId: string) {
    if (!this.gameState) return
    const payload = projectStateForPlayer(this.gameState, userId)
    send(conn, { type: 'GAME_STATE', payload })
  }

  private broadcastGameState() {
    if (!this.gameState) return
    for (const [connId, info] of this.connections) {
      const conn = this.room.getConnection(connId)
      if (conn) this.sendGameState(conn, info.userId)
    }
  }

  private broadcastMessage(msg: ServerMessage) {
    for (const [connId] of this.connections) {
      const conn = this.room.getConnection(connId)
      if (conn) send(conn, msg)
    }
  }
}
GameServer satisfies Party.Worker
