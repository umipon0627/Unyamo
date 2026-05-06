import type * as Party from 'partykit/server'
import type { GameState, PlayerState } from '../src/types/game'
import type { Card } from '../src/types/card'
import type { ServerMessage } from './messages'
import { clientMessageSchema } from './messages'
import { verifyToken } from './auth'
import { projectStateForPlayer } from './projection'
import { createDeck, shuffleDeck, dealCards, drawFromDeck, drawFromDiscardPile } from '../src/game-logic/deck'
import { initializeTurnOrder, advanceTurn, getCurrentPlayerId, isRoundComplete } from '../src/game-logic/turn'
import {
  validateTurn, validatePhase, validateCardExists,
  validateDiscardMultiple, validateUnyamo, validateNoDuplicateAction, validateDrawSource,
  validateDiscardPickup, validateDrawPhase, validateDiscardPhase,
  validateUnyamoNotYetDeclared,
} from '../src/game-logic/validation'
import { judgeWinner } from '../src/game-logic/unyamo'
import { decideUnyamoDeclaration, decideDrawSource, decideDiscard } from '../src/game-logic/cpu'
import type { CpuDifficulty } from '../src/game-logic/cpu'
import { escapeHtml } from './utils'
import { TURN_TIMEOUT_MS } from './timeout'
import { RECONNECT_TIMEOUT_MS, ROOM_DESTROY_TIMEOUT_MS } from './connection'

function send(conn: Party.Connection, msg: ServerMessage): void {
  conn.send(JSON.stringify(msg))
}

export default class GameServer implements Party.Server {
  gameState: GameState | null = null
  connections = new Map<string, { userId: string; name: string }>()
  turnTimer: ReturnType<typeof setTimeout> | null = null
  disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()
  roomDestroyTimer: ReturnType<typeof setTimeout> | null = null
  lastMessageAt = new Map<string, number>()

  // CPU対戦用フィールド
  cpuPlayerIds = new Set<string>()
  cpuDifficulty: CpuDifficulty = 'EASY'
  cpuActionTimer: ReturnType<typeof setTimeout> | null = null

  constructor(readonly room: Party.Room) {}

  onConnect(_conn: Party.Connection) {
    // 接続確立のみ。JOINメッセージを待つ
  }

  async onMessage(message: string, sender: Party.Connection) {
    // レート制限: 1秒1回（CPUプレイヤーはレート制限対象外）
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
      case 'START_CPU_GAME': return this.handleStartCpuGame(sender, msg.payload)
      case 'DISCARD': return this.handleDiscard(sender, msg.payload.cardId)
      case 'DISCARD_MULTIPLE': return this.handleDiscardMultiple(sender, msg.payload.cardIds)
      case 'DRAW': return this.handleDraw(sender, msg.payload.source)
      case 'DECLARE_UNYAMO': return this.handleDeclareUnyamo(sender)
      case 'RECONNECT': return this.handleReconnect(sender, msg.payload.token)
      case 'RESTART_GAME': return this.handleRestartGame(sender)
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
        lastDiscardedCardIds: [],
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
      hasDiscardedThisTurn: false,
      hasDrawnThisTurn: false,
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
      players: this.gameState.players.map((p, i) => ({
        ...p,
        hand: hands[i] ?? [],
        hasDiscardedThisTurn: false,
        hasDrawnThisTurn: false,
        hasUsedSpecialAction: false,
      })),
      turnOrder,
      currentTurnIndex: 0,
      startedAt: Date.now(),
      lastDiscardedCardIds: [],
      unyamoDeclarerId: null,
      remainingPlayersAfterDeclare: [],
    }
    this.broadcastGameState()
    this.scheduleTurnTimeout()
  }

  private handleStartCpuGame(
    conn: Party.Connection,
    payload: { cpuCount: number; difficulty: 'EASY' | 'HARD' }
  ) {
    const info = this.connections.get(conn.id)
    if (!info || !this.gameState) return

    if (info.userId !== this.gameState.hostId) {
      send(conn, { type: 'ERROR', payload: { code: 'NOT_HOST', message: 'Only host can start the game' } })
      return
    }
    if (this.gameState.phase !== 'WAITING') {
      send(conn, { type: 'ERROR', payload: { code: 'WRONG_PHASE', message: 'Game already started' } })
      return
    }
    // ホスト（自分）のみの状態でCPUゲーム開始を許可
    if (this.gameState.players.length !== 1) {
      send(conn, { type: 'ERROR', payload: { code: 'TOO_MANY_PLAYERS', message: 'CPU game requires exactly 1 human player' } })
      return
    }

    const { cpuCount, difficulty } = payload
    this.cpuDifficulty = difficulty

    // CPUプレイヤーを追加
    const cpuPlayers: PlayerState[] = Array.from({ length: cpuCount }, (_, i) => ({
      id: `cpu:${i}:${this.room.id}`,
      name: `CPU${i + 1}`,
      hand: [],
      isConnected: true,
      lastActiveAt: Date.now(),
      hasDiscardedThisTurn: false,
      hasDrawnThisTurn: false,
      hasUsedSpecialAction: false,
    }))

    // cpuPlayerIdsを登録
    this.cpuPlayerIds = new Set(cpuPlayers.map(p => p.id))

    const allPlayers = [...this.gameState.players, ...cpuPlayers]
    const deck = shuffleDeck(createDeck())
    const { hands, remainingDeck } = dealCards(deck, allPlayers.length)
    const turnOrder = initializeTurnOrder(allPlayers.map(p => p.id))

    this.gameState = {
      ...this.gameState,
      phase: 'PLAYING',
      deck: remainingDeck,
      discardPile: [],
      players: allPlayers.map((p, i) => ({
        ...p,
        hand: hands[i] ?? [],
        hasDiscardedThisTurn: false,
        hasDrawnThisTurn: false,
        hasUsedSpecialAction: false,
      })),
      turnOrder,
      currentTurnIndex: 0,
      startedAt: Date.now(),
      lastDiscardedCardIds: [],
      unyamoDeclarerId: null,
      remainingPlayersAfterDeclare: [],
    }
    this.broadcastGameState()
    // ターンタイムアウトはCPUターンには不要
    if (!this.cpuPlayerIds.has(getCurrentPlayerId(this.gameState))) {
      this.scheduleTurnTimeout()
    }
    this.scheduleCpuActionIfNeeded()
  }

  /**
   * 現在ターンプレイヤーがCPUであれば、遅延後にCPUターンを実行する。
   */
  private scheduleCpuActionIfNeeded() {
    if (!this.gameState) return
    const currentId = getCurrentPlayerId(this.gameState)
    if (!this.cpuPlayerIds.has(currentId)) return

    // 既存タイマーをクリア
    if (this.cpuActionTimer) {
      clearTimeout(this.cpuActionTimer)
      this.cpuActionTimer = null
    }

    const delay = 800 + Math.floor(Math.random() * 700) // 800〜1499ms
    this.cpuActionTimer = setTimeout(() => {
      this.cpuActionTimer = null
      this.executeCpuTurn(currentId)
    }, delay)
  }

  /**
   * CPUのターンを自動実行する。
   * 仕様 2.6節: ターン順序は ACTION_PHASE（DISCARD or ウニャモ宣言）→ DRAW_PHASE。
   */
  private executeCpuTurn(cpuId: string) {
    if (!this.gameState) return
    const player = this.gameState.players.find(p => p.id === cpuId)
    if (!player) return

    // ACTION_PHASE: ウニャモ宣言 or DISCARD
    if (!player.hasDiscardedThisTurn) {
      // ウニャモ宣言チェック（ターン開始時のみ可能。すでに誰かが宣言済みなら不可）
      if (this.gameState.unyamoDeclarerId === null) {
        const shouldDeclare = decideUnyamoDeclaration(player.hand, this.cpuDifficulty)
        if (shouldDeclare) {
          this.performDeclareUnyamo(cpuId)
          this.scheduleCpuActionIfNeeded()
          return
        }
      }

      // DISCARD: 1枚または特殊操作で2-3枚
      const cardIds = decideDiscard(player.hand, this.cpuDifficulty)
      if (cardIds.length === 0) return
      this.performDiscard(cpuId, cardIds)
      // performDiscard は advance せずに DRAW を待つ
    }

    // DRAW_PHASE（500ms後）
    this.cpuActionTimer = setTimeout(() => {
      this.cpuActionTimer = null
      if (!this.gameState) return
      const updatedPlayer = this.gameState.players.find(p => p.id === cpuId)
      if (!updatedPlayer || !updatedPlayer.hasDiscardedThisTurn) return
      if (updatedPlayer.hasDrawnThisTurn) return

      // 仕様 2.3節: 捨て札の一番上から1枚引く（ただし自分が今捨てたものは拾えない）
      const discardTop = this.gameState.discardPile[this.gameState.discardPile.length - 1] ?? null
      const isOwnLastDiscard =
        !!discardTop && this.gameState.lastDiscardedCardIds.includes(discardTop.id)
      const canPickupFromDiscard = !!discardTop && !isOwnLastDiscard

      const source = decideDrawSource(
        updatedPlayer.hand,
        discardTop,
        canPickupFromDiscard,
        this.cpuDifficulty
      )
      this.performDraw(cpuId, source)
      // DRAW完了 → ターン進行（advanceAfterDraw 内で scheduleCpuActionIfNeeded を実行）
      this.advanceAfterDraw(cpuId)
    }, 500)
  }

  /**
   * DRAWの内部処理（CPU・人間共通）
   * 仕様 2.6節: ターンの後半フェーズ。DISCARDの後に呼ばれる。
   */
  private performDraw(playerId: string, source: 'deck' | 'discard') {
    if (!this.gameState) return

    // バリデーション
    const player = this.gameState.players.find(p => p.id === playerId)
    if (!player) return
    const checks = [
      validatePhase(this.gameState, 'DRAW'),
      validateTurn(this.gameState, playerId),
      validateDrawPhase(player),
      validateDrawSource(this.gameState, source),
      ...(source === 'discard' ? [validateDiscardPickup(this.gameState, playerId)] : []),
    ]
    for (const r of checks) {
      if (!r.valid) return // CPU操作なのでエラーは無視
    }

    let drawnCard: Card | null = null
    if (source === 'deck') {
      const { card, remainingDeck } = drawFromDeck(this.gameState.deck)
      drawnCard = card
      this.gameState = { ...this.gameState, deck: remainingDeck }
    } else {
      const { card, remainingPile } = drawFromDiscardPile(this.gameState.discardPile)
      drawnCard = card
      this.gameState = { ...this.gameState, discardPile: remainingPile }
    }

    if (!drawnCard) return

    this.gameState = {
      ...this.gameState,
      players: this.gameState.players.map(p =>
        p.id === playerId
          ? { ...p, hand: [...p.hand, drawnCard!], hasDrawnThisTurn: true, lastActiveAt: Date.now() }
          : p
      ),
    }
    this.broadcastGameState()
  }

  /**
   * DISCARDの内部処理（CPU・人間共通）
   * 仕様 2.6節: ACTION_PHASE。ターンの最初のフェーズ。
   * cardIds.length === 1: 通常捨て
   * cardIds.length >= 2: 特殊操作（DISCARD_MULTIPLE）
   * 完了後はDRAW_PHASEに移行する（ターンは進めない）。
   */
  private performDiscard(playerId: string, cardIds: string[]) {
    if (!this.gameState) return
    const player = this.gameState.players.find(p => p.id === playerId)
    if (!player) return

    if (cardIds.length === 1) {
      const cardId = cardIds[0]!
      const checks = [
        validatePhase(this.gameState, 'DISCARD'),
        validateTurn(this.gameState, playerId),
        validateDiscardPhase(player),
        validateNoDuplicateAction(player, 'normal'),
        validateCardExists(player.hand, [cardId]),
      ]
      for (const r of checks) {
        if (!r.valid) return
      }

      const card = player.hand.find(c => c.id === cardId)!
      this.gameState = {
        ...this.gameState,
        discardPile: [...this.gameState.discardPile, card],
        lastDiscardedCardIds: [card.id],
        players: this.gameState.players.map(p =>
          p.id === playerId
            ? { ...p, hand: p.hand.filter(c => c.id !== cardId), hasDiscardedThisTurn: true, lastActiveAt: Date.now() }
            : p
        ),
      }
    } else {
      // DISCARD_MULTIPLE
      const selectedCards = player.hand.filter(c => cardIds.includes(c.id))
      const checks = [
        validatePhase(this.gameState, 'DISCARD_MULTIPLE'),
        validateTurn(this.gameState, playerId),
        validateDiscardPhase(player),
        validateNoDuplicateAction(player, 'special'),
        validateCardExists(player.hand, cardIds),
        validateDiscardMultiple(selectedCards),
      ]
      for (const r of checks) {
        if (!r.valid) return
      }

      this.gameState = {
        ...this.gameState,
        discardPile: [...this.gameState.discardPile, ...selectedCards],
        lastDiscardedCardIds: selectedCards.map(c => c.id),
        players: this.gameState.players.map(p =>
          p.id === playerId
            ? { ...p, hand: p.hand.filter(c => !cardIds.includes(c.id)), hasDiscardedThisTurn: true, hasUsedSpecialAction: true, lastActiveAt: Date.now() }
            : p
        ),
      }
    }

    this.broadcastGameState()
  }

  /**
   * ウニャモ宣言の内部処理（CPU・人間共通）
   */
  private performDeclareUnyamo(playerId: string) {
    if (!this.gameState) return
    const player = this.gameState.players.find(p => p.id === playerId)
    if (!player) return

    const checks = [
      validatePhase(this.gameState, 'DECLARE_UNYAMO'),
      validateTurn(this.gameState, playerId),
      validateUnyamoNotYetDeclared(this.gameState),
      validateUnyamo(player.hand),
    ]
    for (const r of checks) {
      if (!r.valid) return
    }

    const remainingPlayers = this.gameState.turnOrder.filter(id => id !== playerId)
    this.gameState = {
      ...this.gameState,
      unyamoDeclarerId: playerId,
      remainingPlayersAfterDeclare: remainingPlayers,
    }

    this.broadcastMessage({ type: 'UNYAMO_DECLARED', payload: { playerId, playerName: player.name } })

    if (isRoundComplete(this.gameState)) {
      this.finalizeGame()
      return
    }

    this.gameState = advanceTurn(this.gameState)
    this.broadcastMessage({ type: 'TURN_CHANGE', payload: { currentPlayerId: getCurrentPlayerId(this.gameState) } })
    this.broadcastGameState()
    if (!this.cpuPlayerIds.has(getCurrentPlayerId(this.gameState))) {
      this.scheduleTurnTimeout()
    }
    this.scheduleCpuActionIfNeeded()
  }

  private handleDiscard(conn: Party.Connection, cardId: string) {
    const info = this.connections.get(conn.id)
    if (!info || !this.gameState) return

    const player = this.gameState.players.find(p => p.id === info.userId)
    if (!player) return

    const checks = [
      validatePhase(this.gameState, 'DISCARD'),
      validateTurn(this.gameState, info.userId),
      validateDiscardPhase(player),
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
    this.gameState = {
      ...this.gameState,
      discardPile: [...this.gameState.discardPile, card],
      lastDiscardedCardIds: [card.id],
      players: this.gameState.players.map(p =>
        p.id === info.userId
          ? { ...p, hand: p.hand.filter(c => c.id !== cardId), hasDiscardedThisTurn: true, lastActiveAt: Date.now() }
          : p
      ),
    }
    send(conn, { type: 'ACTION_RESULT', payload: { success: true, action: 'DISCARD', playerId: info.userId } })

    // 仕様 2.6節: DISCARDの後はDRAW_PHASE。ターンはまだ進めない。
    this.broadcastGameState()
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
      validateDiscardPhase(player),
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

    this.gameState = {
      ...this.gameState,
      discardPile: [...this.gameState.discardPile, ...selectedCards],
      lastDiscardedCardIds: selectedCards.map(c => c.id),
      players: this.gameState.players.map(p =>
        p.id === info.userId
          ? { ...p, hand: p.hand.filter(c => !cardIds.includes(c.id)), hasDiscardedThisTurn: true, hasUsedSpecialAction: true, lastActiveAt: Date.now() }
          : p
      ),
    }
    send(conn, { type: 'ACTION_RESULT', payload: { success: true, action: 'DISCARD_MULTIPLE', playerId: info.userId } })

    // 仕様 2.6節: DISCARDの後はDRAW_PHASE。ターンはまだ進めない。
    this.broadcastGameState()
  }

  private handleDraw(conn: Party.Connection, source: 'deck' | 'discard') {
    const info = this.connections.get(conn.id)
    if (!info || !this.gameState) return

    const player = this.gameState.players.find(p => p.id === info.userId)
    if (!player) return

    const checks = [
      validatePhase(this.gameState, 'DRAW'),
      validateTurn(this.gameState, info.userId),
      validateDrawPhase(player),
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
      drawnCard = card
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

    // 仕様 2.6節: DRAW完了 → ターン終了して次のプレイヤーへ。
    this.advanceAfterDraw(info.userId)
  }

  /**
   * DRAW完了後にターンを進める共通処理。
   * 仕様 2.6節: ACTION_PHASE → DRAW_PHASE → TURN_END
   */
  private advanceAfterDraw(actorId: string) {
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

    // 次のターンプレイヤーがCPUでなければタイムアウトをセット
    if (!this.cpuPlayerIds.has(getCurrentPlayerId(this.gameState))) {
      this.scheduleTurnTimeout()
    }
    this.scheduleCpuActionIfNeeded()
  }

  private handleDeclareUnyamo(conn: Party.Connection) {
    const info = this.connections.get(conn.id)
    if (!info || !this.gameState) return

    const player = this.gameState.players.find(p => p.id === info.userId)
    if (!player) return

    const checks = [
      validatePhase(this.gameState, 'DECLARE_UNYAMO'),
      validateTurn(this.gameState, info.userId),
      validateUnyamoNotYetDeclared(this.gameState),
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
    if (!this.cpuPlayerIds.has(getCurrentPlayerId(this.gameState))) {
      this.scheduleTurnTimeout()
    }
    this.scheduleCpuActionIfNeeded()
  }

  private async handleReconnect(conn: Party.Connection, token: string) {
    await this.handleJoin(conn, token)
  }

  /**
   * 結果画面の「もう一度遊ぶ」: ホストのみが実行可能。
   * ルームを WAITING にリセットし、CPU プレイヤーは取り除く。
   * その後、待機画面で人間プレイヤーがそれぞれ START_GAME / START_CPU_GAME を送れる状態にする。
   */
  private handleRestartGame(conn: Party.Connection) {
    const info = this.connections.get(conn.id)
    if (!info || !this.gameState) return
    if (info.userId !== this.gameState.hostId) {
      send(conn, { type: 'ERROR', payload: { code: 'NOT_HOST', message: 'Only host can restart' } })
      return
    }
    if (this.gameState.phase !== 'RESULT' && this.gameState.phase !== 'JUDGING') {
      send(conn, { type: 'ERROR', payload: { code: 'WRONG_PHASE', message: 'Restart only allowed after game end' } })
      return
    }

    this.cancelTurnTimeout()
    if (this.cpuActionTimer) {
      clearTimeout(this.cpuActionTimer)
      this.cpuActionTimer = null
    }

    // CPUプレイヤーを除去（人間のみ残す）
    const humanPlayers = this.gameState.players
      .filter(p => !this.cpuPlayerIds.has(p.id))
      .map(p => ({
        ...p,
        hand: [],
        hasDiscardedThisTurn: false,
        hasDrawnThisTurn: false,
        hasUsedSpecialAction: false,
      }))
    this.cpuPlayerIds = new Set()

    this.gameState = {
      ...this.gameState,
      phase: 'WAITING',
      players: humanPlayers,
      deck: [],
      discardPile: [],
      currentTurnIndex: 0,
      turnOrder: [],
      unyamoDeclarerId: null,
      remainingPlayersAfterDeclare: [],
      startedAt: null,
      lastDiscardedCardIds: [],
    }
    this.broadcastGameState()
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

    // CPU以外の登録済みプレイヤーが1人でもいればDB保存を試みる
    const hasRegisteredPlayer = results.some(r =>
      !r.playerId.startsWith('guest:') && !r.playerId.startsWith('cpu:')
    )
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
        }).catch(() => {})
      }
    }
  }

  private scheduleTurnTimeout() {
    this.cancelTurnTimeout()
    if (!this.gameState) return
    const currentPlayerId = getCurrentPlayerId(this.gameState)

    // CPUのターンにはタイムアウトを設定しない
    if (this.cpuPlayerIds.has(currentPlayerId)) return

    this.turnTimer = setTimeout(() => {
      if (!this.gameState) return
      const player = this.gameState.players.find(p => p.id === currentPlayerId)
      if (!player) return

      // 仕様 6.4節: 自動操作 = 手札の最大点カードを1枚捨てる → 山札から1枚引く。
      // 仕様 2.6節の順序に従い、まずDISCARDを実施してからDRAW。
      if (!player.hasDiscardedThisTurn && player.hand.length > 0) {
        const maxCard = player.hand.reduce((max, c) => {
          const score = c.suit === 'joker' ? 0 : c.rank
          const maxScore = max.suit === 'joker' ? 0 : max.rank
          return score > maxScore ? c : max
        }, player.hand[0]!)
        this.gameState = {
          ...this.gameState,
          discardPile: [...this.gameState.discardPile, maxCard],
          lastDiscardedCardIds: [maxCard.id],
          players: this.gameState.players.map(p =>
            p.id === currentPlayerId
              ? { ...p, hand: p.hand.filter(c => c.id !== maxCard.id), hasDiscardedThisTurn: true }
              : p
          ),
        }
      }

      const afterDiscard = this.gameState.players.find(p => p.id === currentPlayerId)
      if (afterDiscard && !afterDiscard.hasDrawnThisTurn) {
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

      this.advanceAfterDraw(currentPlayerId)
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
