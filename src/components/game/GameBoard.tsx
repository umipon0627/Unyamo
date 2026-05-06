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
    return <div className="flex items-center justify-center h-screen text-slate-400">接続中...</div>
  }
  if (status === 'error' || status === 'closed') {
    return <div className="flex items-center justify-center h-screen text-red-400">接続エラー。ページを再読み込みしてください。</div>
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
    return <div className="flex items-center justify-center h-screen text-slate-400">接続中...</div>
  }

  return (
    <div className="relative flex flex-col h-screen bg-slate-900 overflow-hidden select-none">
      {/* Unyamo flash overlay */}
      <AnimatePresence>
        {showUnyamoFlash && (
          <motion.div
            className="absolute inset-0 bg-amber-400/30 z-50 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* Header: turn indicator */}
      <div className="flex items-center justify-center py-2 px-4 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <TurnIndicator
          currentPlayerName={others.find(p => p.id === currentPlayerId)?.name ?? 'あなた'}
          isMyTurn={isMyTurn}
        />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[1fr_2fr_1fr] overflow-hidden p-2 gap-2">
        {/* Other players - mobile: top row, desktop: left+right columns */}
        <div className="flex flex-row justify-around lg:flex-col lg:justify-start gap-2 flex-shrink-0">
          {others.slice(0, Math.ceil(others.length / 2)).map(p => (
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

        {/* Center: deck + discard */}
        <div className="flex items-center justify-center gap-6 flex-shrink-0">
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

        {/* Right column on desktop: remaining players */}
        <div className="hidden lg:flex flex-col justify-start gap-2">
          {others.slice(Math.ceil(others.length / 2)).map(p => (
            <PlayerArea
              key={p.id}
              player={{ ...p, cardCount: p.cardCount, image: undefined }}
              isCurrentTurn={p.id === currentPlayerId}
              hasDeclaredUnyamo={p.id === unyamoDeclarerId}
              position="right"
              compact
            />
          ))}
        </div>
      </div>

      {/* Bottom: my hand + actions */}
      <div className="flex-shrink-0 bg-slate-800 border-t border-slate-700 pb-safe">
        <div className="flex flex-col items-center gap-2 py-3 px-4">
          <Hand
            cards={myHand}
            selectedIndices={selectedIndices}
            onSelect={isMyTurn && canDiscard ? handleCardSelect : undefined}
            size="md"
            isMobile
          />
          <div className="flex items-center gap-3 flex-wrap justify-center">
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
          <p className="text-slate-500 text-xs">合計: {gameState.myTotalScore}点</p>
        </div>
      </div>

      {/* Result modal */}
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
