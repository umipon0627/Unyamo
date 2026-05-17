'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useGameState } from '@/hooks/useGameState'
import { useAnimation } from '@/hooks/useAnimation'
import { Hand } from './Hand'
import { Deck } from './Deck'
import { DiscardPile } from './DiscardPile'
import { PlayerArea } from './PlayerArea'
import { ActionPanel } from './ActionPanel'
import { UnyamoButton } from './UnyamoButton'
import { TurnIndicator } from './TurnIndicator'
import { ResultModal } from './ResultModal'
import { WaitingRoom } from './WaitingRoom'

interface GameBoardProps {
  roomId: string
  myPlayerId: string
  token: string
}

export function GameBoard({ roomId, myPlayerId, token }: GameBoardProps) {
  const router = useRouter()
  const { status, send, lastMessage } = useWebSocket(roomId, token)
  const { gameState, myHand, discardTop, currentPlayerId, phase, isMyTurn, results, unyamoDeclarerId, availableActions, hostId, maxPlayers, roomName, players, canStartGame } = useGameState(lastMessage, myPlayerId)
  const { showUnyamoFlash, triggerUnyamoFlash } = useAnimation()
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])

  // CPU対戦: 自動開始フラグ
  const cpuGameStartedRef = useRef(false)

  const isCpuRoom = roomId.startsWith('cpu-')
  const backPath = isCpuRoom ? '/play' : '/lobby'

  // CPU対戦の設定: 初回ゲーム開始時に消費し、再戦時に復元するため別キーで残す
  const cpuLastConfigRef = useRef<{ cpuCount: number; difficulty: 'EASY' | 'HARD' } | null>(null)

  // CPU対戦: WAITING状態かつホストの場合、sessionStorageの設定を読んでSTART_CPU_GAMEを送信
  useEffect(() => {
    if (!isCpuRoom) return
    if (cpuGameStartedRef.current) return
    if (status !== 'open') return
    if (phase !== 'WAITING') return
    if (hostId !== myPlayerId) return

    const configJson = sessionStorage.getItem(`cpu-config-${roomId}`)
    if (!configJson) return

    try {
      const config = JSON.parse(configJson) as { cpuCount: number; difficulty: 'EASY' | 'HARD' }
      cpuGameStartedRef.current = true
      cpuLastConfigRef.current = config
      sessionStorage.removeItem(`cpu-config-${roomId}`)
      send({ type: 'START_CPU_GAME', payload: { cpuCount: config.cpuCount, difficulty: config.difficulty } })
    } catch {
      // 不正なJSONは無視
    }
  }, [isCpuRoom, status, phase, hostId, myPlayerId, roomId, send])

  // 再戦フラグ: RESULT → WAITING に戻った後の自動再開（CPUルームのみ）
  const restartingRef = useRef(false)

  // CPUルーム: WAITING かつホスト かつ 再戦リクエスト後 → 同じ設定でゲームを再開
  useEffect(() => {
    if (!isCpuRoom) return
    if (!restartingRef.current) return
    if (status !== 'open') return
    if (phase !== 'WAITING') return
    if (hostId !== myPlayerId) return
    const config = cpuLastConfigRef.current
    if (!config) {
      restartingRef.current = false
      return
    }
    restartingRef.current = false
    send({ type: 'START_CPU_GAME', payload: { cpuCount: config.cpuCount, difficulty: config.difficulty } })
  }, [isCpuRoom, status, phase, hostId, myPlayerId, send])

  const others = gameState?.otherPlayers ?? []

  const handleCardSelect = useCallback((index: number) => {
    setSelectedIndices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    )
  }, [])

  const handleDiscard = useCallback(() => {
    if (selectedIndices.length !== 1) return
    const card = myHand[selectedIndices[0]!]
    if (!card) return
    send({ type: 'DISCARD', payload: { cardId: card.id } })
    setSelectedIndices([])
  }, [selectedIndices, myHand, send])

  const handleDiscardMultiple = useCallback(() => {
    const cardIds = selectedIndices.map(i => myHand[i]?.id).filter((id): id is string => !!id)
    send({ type: 'DISCARD_MULTIPLE', payload: { cardIds } })
    setSelectedIndices([])
  }, [selectedIndices, myHand, send])

  const handleDraw = useCallback((source: 'deck' | 'discard') => {
    send({ type: 'DRAW', payload: { source } })
  }, [send])

  const handleDeclareUnyamo = useCallback(() => {
    triggerUnyamoFlash()
    send({ type: 'DECLARE_UNYAMO' })
  }, [send, triggerUnyamoFlash])

  const handlePlayAgain = useCallback(() => {
    if (isCpuRoom) {
      // CPUルーム: ホストが RESTART_GAME を送信 → サーバーは WAITING にリセット
      // → useEffect で同じ設定で START_CPU_GAME を再送信
      restartingRef.current = true
    }
    send({ type: 'RESTART_GAME' })
  }, [isCpuRoom, send])

  const handleExit = useCallback(() => {
    router.push(backPath)
  }, [router, backPath])

  // 仕様 2.6節: ターンは ACTION_PHASE（DISCARD or ウニャモ宣言） → DRAW_PHASE → TURN_END
  const canDiscard = availableActions.includes('DISCARD') || availableActions.includes('DISCARD_MULTIPLE')
  const isDrawPhase = availableActions.includes('DRAW')
  const canDrawDeck = isDrawPhase && (gameState?.deckCount ?? 0) > 0
  const canDrawDiscard =
    isDrawPhase &&
    !!discardTop &&
    (gameState?.canPickupFromDiscard ?? false)
  const canDeclare = availableActions.includes('DECLARE_UNYAMO')
  const hasUsedSpecial = !availableActions.includes('DISCARD_MULTIPLE') && canDiscard

  if (status === 'connecting') {
    return (
      <div className="flex items-center justify-center h-screen bg-felt">
        <p className="text-[#f2eee6]/60 font-heading text-lg">接続中...</p>
      </div>
    )
  }
  if (status === 'error' || status === 'closed') {
    return (
      <div className="flex items-center justify-center h-screen bg-felt">
        <p className="text-[#e97179] font-heading text-lg">接続エラー。ページを再読み込みしてください。</p>
      </div>
    )
  }
  if (phase === 'WAITING') {
    return (
      <WaitingRoom
        roomId={roomId}
        roomName={roomName}
        players={players}
        hostId={hostId}
        maxPlayers={maxPlayers}
        myPlayerId={myPlayerId}
        canStartGame={canStartGame}
        onStartGame={() => send({ type: 'START_GAME' })}
        onLeaveRoom={() => router.push(backPath)}
      />
    )
  }
  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-screen bg-felt">
        <p className="text-[#f2eee6]/60 font-heading text-lg">接続中...</p>
      </div>
    )
  }

  const currentPlayerName = others.find(p => p.id === currentPlayerId)?.name ?? 'あなた'

  return (
    <div className="relative flex flex-col h-screen bg-felt overflow-hidden select-none">
      {/* ウニャモ宣言フラッシュ（金色放射グロー） */}
      <AnimatePresence>
        {showUnyamoFlash && (
          <motion.div
            className="absolute inset-0 z-50 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, rgba(229,182,73,0.55) 0%, rgba(229,182,73,0.15) 50%, transparent 75%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ===== 上部ヘッダー ===== */}
      <header className="flex-shrink-0 bg-felt-panel border-b border-[#f2eee6]/10 px-4 py-2 flex items-center justify-between gap-2">
        {/* 戻るボタン */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f2eee6]/10 text-[#f2eee6]/70 hover:bg-[#f2eee6]/20 transition-colors"
          onClick={handleExit}
          aria-label="退出して戻る"
        >
          ←
        </button>

        {/* 中央: ターンインジケーター */}
        <div className="flex-1 flex justify-center">
          <TurnIndicator
            currentPlayerName={currentPlayerName}
            isMyTurn={isMyTurn}
          />
        </div>

        {/* 右: 山札残枚数バッジ */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f2eee6]/10 border border-[#f2eee6]/10">
          <span className="text-[#f2eee6]/50 text-xs" aria-hidden="true">🃏</span>
          <span className="text-[#f2eee6]/70 text-xs font-heading font-bold" aria-label={`山札残り${gameState.deckCount}枚`}>
            {gameState.deckCount}
          </span>
        </div>
      </header>

      {/* ===== 相手プレイヤーエリア（横並びチップ） ===== */}
      {others.length > 0 && (
        <div className="flex-shrink-0 px-3 py-2 flex flex-row flex-wrap justify-center gap-2">
          {others.map(p => (
            <PlayerArea
              key={p.id}
              player={{ ...p, cardCount: p.cardCount, image: undefined }}
              isCurrentTurn={p.id === currentPlayerId}
              hasDeclaredUnyamo={p.id === unyamoDeclarerId}
              position="top"
              compact
            />
          ))}
        </div>
      )}

      {/* ===== 中央エリア: 山札 + 捨て札 ===== */}
      <div className="flex-1 flex items-center justify-center gap-8 px-4 min-h-0">
        {/* デスクトップ: 左側の追加プレイヤー（3人以上） */}
        {others.length > 2 && (
          <div className="hidden md:flex flex-col gap-2">
            {others.slice(2).map(p => (
              <PlayerArea
                key={p.id}
                player={{ ...p, cardCount: p.cardCount, image: undefined }}
                isCurrentTurn={p.id === currentPlayerId}
                hasDeclaredUnyamo={p.id === unyamoDeclarerId}
                position="left"
                compact
              />
            ))}
          </div>
        )}

        {/* 山札 + 捨て札 */}
        <div className="flex items-center justify-center gap-6">
          <Deck
            remaining={gameState.deckCount}
            onDraw={canDrawDeck ? () => handleDraw('deck') : undefined}
            disabled={!canDrawDeck}
          />
          <DiscardPile
            topCard={discardTop}
            onPickup={canDrawDiscard ? () => handleDraw('discard') : undefined}
            canPickup={canDrawDiscard}
          />
        </div>
      </div>

      {/* ===== 下部: 手札 + アクションパネル ===== */}
      <div className="flex-shrink-0 bg-felt-panel border-t border-[#f2eee6]/10 pb-safe">
        <div className="flex flex-col items-center gap-3 pt-3 pb-3 px-4">
          {/* 手札ラベル */}
          <div className="flex items-center gap-2">
            <span className="text-[#f2eee6]/50 text-xs font-heading font-bold uppercase tracking-wider">
              YOUR HAND
            </span>
            <span className="w-5 h-5 rounded-full bg-[#f2eee6]/15 text-[#f2eee6]/70 text-[10px] font-heading font-bold flex items-center justify-center">
              {myHand.length}
            </span>
          </div>

          {/* 手札扇形 */}
          <Hand
            cards={myHand}
            selectedIndices={selectedIndices}
            onSelect={isMyTurn && canDiscard ? handleCardSelect : undefined}
            size="md"
            isMobile
          />

          {/* アクションボタン行 */}
          <div className="flex items-center gap-3 flex-wrap justify-center pt-1">
            <ActionPanel
              isMyTurn={isMyTurn}
              canDiscard={canDiscard}
              isDrawPhase={isDrawPhase}
              canDrawDeck={canDrawDeck}
              canDrawDiscard={canDrawDiscard}
              selectedCount={selectedIndices.length}
              hasUsedSpecial={hasUsedSpecial}
              onDraw={handleDraw}
              onDiscard={handleDiscard}
              onDiscardMultiple={handleDiscardMultiple}
              discardTop={discardTop}
            />
            <UnyamoButton
              canDeclare={canDeclare}
              hasDeclared={myPlayerId === unyamoDeclarerId}
              onDeclare={handleDeclareUnyamo}
            />
          </div>

          {/* 合計スコア */}
          <p className="text-[#f2eee6]/40 text-xs">合計: {gameState.myTotalScore}点</p>
        </div>
      </div>

      {/* リザルトモーダル */}
      <ResultModal
        open={phase === 'RESULT' && !!results}
        results={results?.results ?? []}
        myPlayerId={myPlayerId}
        isHost={hostId === myPlayerId}
        onPlayAgain={handlePlayAgain}
        onExit={handleExit}
      />
    </div>
  )
}
