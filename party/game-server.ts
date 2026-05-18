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

/**
 * Alarm ストレージキー: 次に手番が来るCPU 1人分を永続化する。
 * PartyKit/Durable Objects の Alarm API を使い、ハイバネーション後も確実に発火させる。
 * Alarmは同時に1個のみ＝常に「次の1CPUターン」専用。onAlarmでそのCPUの
 * 1ターン(宣言 or DRAW→DISCARD→進行)を丸ごと完走し、続きは末尾で1個だけ再予約する。
 */
const CPU_ALARM_KEY = 'cpu_alarm_step'

// Durable Objects は Alarm を同時に1つしか持てない。
// そのため「次に手番が来るCPU 1人分のターン」だけを指す単一マーカーにする。
// 多段(DRAW/DISCARD/ADVANCE)Alarm はスロット競合で消失するため廃止。
type CpuAlarmStep = { cpuId: string }

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
  // cpuActionTimer は Alarm ベースに移行したため廃止。
  // 旧 setTimeout ベースの変数は残さない（競合防止）。

  constructor(readonly room: Party.Room) {}

  onConnect(_conn: Party.Connection) {
    // 接続確立のみ。JOINメッセージを待つ
  }

  async onMessage(message: string, sender: Party.Connection) {
    const parsed = clientMessageSchema.safeParse(JSON.parse(message))
    if (!parsed.success) {
      send(sender, { type: 'ERROR', payload: { code: 'INVALID_MESSAGE', message: 'Invalid message format' } })
      return
    }

    const msg = parsed.data

    // レート制限: ゲーム操作系のみ1秒1回（連打防止）。
    // JOIN/START系/RECONNECT/RESTART等のライフサイクル系は対象外
    // （JOIN直後にSTART_CPU_GAMEを送る等の正当な連続送信をブロックしないため）。
    const RATE_LIMITED_TYPES = new Set([
      'DISCARD', 'DISCARD_MULTIPLE', 'DRAW', 'DECLARE_UNYAMO',
    ])
    if (RATE_LIMITED_TYPES.has(msg.type)) {
      const now = Date.now()
      const last = this.lastMessageAt.get(sender.id) ?? 0
      if (now - last < 1000) {
        send(sender, { type: 'ERROR', payload: { code: 'RATE_LIMITED', message: 'Too many messages' } })
        return
      }
      this.lastMessageAt.set(sender.id, now)
    }
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

  private async handleStartCpuGame(
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
    await this.scheduleCpuActionIfNeeded()
  }

  /**
   * 現在ターンプレイヤーがCPUであれば、Alarm を使って遅延後にCPUターンを実行する。
   *
   * PartyKit/Durable Objects の Alarm API を使用することで、ハイバネーション/エビクション後も
   * タイマーが確実に発火する。素の setTimeout はメッセージハンドラ完了後に途切れ得るため使用しない。
   * UX用遅延 (800-1499ms) は維持する。
   */
  private async scheduleCpuActionIfNeeded() {
    if (!this.gameState) return
    const currentId = getCurrentPlayerId(this.gameState)

    // 手番がCPUでない（人間 or 不在）なら、残っているCPU Alarmを必ず消す。
    // （前ターンの取り残しAlarmがあとでCPUターンを誤発火しないように）
    if (!this.cpuPlayerIds.has(currentId)) {
      await this.room.storage.delete(CPU_ALARM_KEY)
      await this.room.storage.deleteAlarm()
      return
    }

    // 次に手番のCPU 1人分のターンを、単一Alarmで予約（UX遅延 800〜1499ms）。
    // Alarmは常にこの「次の1CPUターン」専用の1個だけ。
    await this.scheduleCpuAlarm({ cpuId: currentId }, 800 + Math.floor(Math.random() * 700))
  }

  /**
   * Alarm ストレージに対象CPUを保存し、Alarm を設定する。
   * Durable Objects は Alarm を1つしか持てないため、常に上書きする。
   * put→setAlarm の順で、これがハンドラ末尾の最後の副作用になるよう呼ぶこと。
   */
  private async scheduleCpuAlarm(alarmStep: CpuAlarmStep, delayMs: number) {
    await this.room.storage.put(CPU_ALARM_KEY, alarmStep)
    await this.room.storage.setAlarm(Date.now() + delayMs)
  }

  /**
   * Alarm 発火時のハンドラ。
   * 対象CPUの「1ターン丸ごと」(必要なら宣言→ or →DRAW→DISCARD→ターン進行)を
   * 同一呼び出し内で同期的に完走する。続きが必要なら advanceAfterDiscard /
   * performDeclareUnyamo 末尾の scheduleCpuActionIfNeeded が次の単一Alarmを張る。
   */
  async onAlarm() {
    const alarmStep = await this.room.storage.get<CpuAlarmStep>(CPU_ALARM_KEY)
    await this.room.storage.delete(CPU_ALARM_KEY)
    if (!alarmStep || !this.gameState) return

    const { cpuId } = alarmStep
    // 予約時と手番がズレていたら（再接続/タイムアウト等）安全に無視。
    if (getCurrentPlayerId(this.gameState) !== cpuId) return
    if (!this.cpuPlayerIds.has(cpuId)) return

    await this.executeCpuFullTurn(cpuId)
  }

  /**
   * CPUの1ターンを丸ごと実行する（Alarmから1ホップで呼ばれる）。
   * - 宣言条件成立かつ未宣言なら performDeclareUnyamo（その中で次Alある）
   * - そうでなければ DRAW → broadcast → DISCARD → advanceAfterDiscard
   * いずれの経路も末尾で scheduleCpuActionIfNeeded が呼ばれ、
   * 次がCPUなら次の単一Alarmが1つだけ張られる（多段Alarm競合を排除）。
   */
  private async executeCpuFullTurn(cpuId: string) {
    if (!this.gameState) return
    const player = this.gameState.players.find(p => p.id === cpuId)
    if (!player) return
    if (player.hasDrawnThisTurn) return

    // ウニャモ宣言（ターン開始時のみ・未宣言時のみ）
    if (this.gameState.unyamoDeclarerId === null) {
      const shouldDeclare = decideUnyamoDeclaration(player.hand, this.cpuDifficulty)
      if (shouldDeclare) {
        await this.performDeclareUnyamo(cpuId)
        return
      }
    }

    // DRAW: 山札 or 捨て札から1枚引く
    const discardTop = this.gameState.discardPile[this.gameState.discardPile.length - 1] ?? null
    const canPickupFromDiscard = !!discardTop
    const source = decideDrawSource(player.hand, discardTop, canPickupFromDiscard, this.cpuDifficulty)
    this.performDraw(cpuId, source)
    // 引いた状態を一旦反映（UX: 引く→捨てるの流れが見える）
    this.broadcastGameState()

    // DISCARD: 引いた直後の手札から1枚（特殊操作で2-3枚）捨てる
    const after = this.gameState.players.find(p => p.id === cpuId)
    if (!after || !after.hasDrawnThisTurn || after.hasDiscardedThisTurn) return
    const cardIds = decideDiscard(after.hand, this.cpuDifficulty)
    if (cardIds.length === 0) return
    this.performDiscard(cpuId, cardIds)

    // ターン進行（内部で isRoundComplete→finalize、でなければ次手番へ。
    // 末尾の scheduleCpuActionIfNeeded が次CPUの単一Alarmを張る）
    await this.advanceAfterDiscard(cpuId)
  }

  /**
   * DRAWの内部処理（CPU・人間共通）
   * 仕様 2.6節: ターンの最初のフェーズ。ターン開始時に引く。
   * 完了後はDISCARD_PHASEに移行する（ターンは進めない）。
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
   * 仕様 2.6節: DISCARD_PHASE。DRAWの後に呼ばれる。
   * cardIds.length === 1: 通常捨て
   * cardIds.length >= 2: 特殊操作（DISCARD_MULTIPLE）
   * このメソッド自体はターンを進めない（advanceAfterDiscardを別途呼ぶこと）。
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
  private async performDeclareUnyamo(playerId: string) {
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

    // 人間ターンで張った30秒タイマーを必ず解除する（残存すると後で誤発火する）。
    // cancelTurnTimeout は冪等なので CPU 宣言時も安全に呼べる。
    this.cancelTurnTimeout()

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
    await this.scheduleCpuActionIfNeeded()
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

    // 仕様 2.6節: DISCARD完了 → ターン終了して次のプレイヤーへ。
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

    // 仕様 2.6節: DISCARD完了 → ターン終了して次のプレイヤーへ。
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

    // 仕様 2.6節: DRAW完了 → DISCARD_PHASEに移行。ターンはまだ進めない。
    this.broadcastGameState()
  }

  /**
   * DISCARD完了後にターンを進める共通処理。
   * 仕様 2.6節: DRAW_PHASE → DISCARD_PHASE → TURN_END
   */
  private async advanceAfterDiscard(actorId: string) {
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
    await this.scheduleCpuActionIfNeeded()
  }

  private async handleDeclareUnyamo(conn: Party.Connection) {
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

    // 人間ターンで張った30秒タイマーを必ず解除する（残存すると後で誤発火する）。
    // cancelTurnTimeout は冪等なので二重呼び出し安全。
    this.cancelTurnTimeout()

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
    await this.scheduleCpuActionIfNeeded()
  }

  private async handleReconnect(conn: Party.Connection, token: string) {
    await this.handleJoin(conn, token)
  }

  /**
   * 結果画面の「もう一度遊ぶ」: ホストのみが実行可能。
   * ルームを WAITING にリセットし、CPU プレイヤーは取り除く。
   * その後、待機画面で人間プレイヤーがそれぞれ START_GAME / START_CPU_GAME を送れる状態にする。
   */
  private async handleRestartGame(conn: Party.Connection) {
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
    // Alarm ベースに移行したため cpuActionTimer の setTimeout クリアは不要。
    // 既存の CPU Alarm を削除してリセット状態にする。
    await this.room.storage.delete(CPU_ALARM_KEY)
    await this.room.storage.deleteAlarm()

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

      // 仕様 6.4節: 自動操作 = 山札から1枚引く → 手札の最大点カードを1枚捨てる。
      // 仕様 2.6節の順序に従い、まずDRAWを実施してからDISCARD。
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
        } else {
          // 山札が空の場合は hasDrawnThisTurn だけ立てる
          this.gameState = {
            ...this.gameState,
            players: this.gameState.players.map(p =>
              p.id === currentPlayerId ? { ...p, hasDrawnThisTurn: true } : p
            ),
          }
        }
      }

      const afterDraw = this.gameState.players.find(p => p.id === currentPlayerId)
      if (afterDraw && !afterDraw.hasDiscardedThisTurn && afterDraw.hand.length > 0) {
        const maxCard = afterDraw.hand.reduce((max, c) => {
          const score = c.suit === 'joker' ? 0 : c.rank
          const maxScore = max.suit === 'joker' ? 0 : max.rank
          return score > maxScore ? c : max
        }, afterDraw.hand[0]!)
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
