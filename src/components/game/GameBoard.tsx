'use client'

import { useState, useCallback } from 'react'
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

interface GameBoardProps {
  roomId: string
  myPlayerId: string
  token: string
}

export function GameBoard({ roomId, myPlayerId, token }: GameBoardProps) {
  const router = useRouter()
  const { status, send, lastMessage } = useWebSocket(roomId, token)
  const { gameState, myHand, discardTop, currentPlayerId, phase, isMyTurn, results, unyamoDeclarerId, availableActions } = useGameState(lastMessage, myPlayerId)
  const { showUnyamoFlash, triggerUnyamoFlash } = useAnimation()
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])

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

  const hasActed = !availableActions.includes('DISCARD') && !availableActions.includes('DISCARD_MULTIPLE')
  const canDrawDeck = availableActions.includes('DRAW') && (gameState?.deckCount ?? 0) > 0
  const canDrawDiscard = availableActions.includes('DRAW') && !!discardTop
  const canDeclare = availableActions.includes('DECLARE_UNYAMO')
  const hasUsedSpecial = !availableActions.includes('DISCARD_MULTIPLE') && !hasActed

  if (status === 'connecting') {
    return <div className="flex items-center justify-center h-screen text-slate-400">接続中...</div>
  }
  if (status === 'error' || status === 'closed') {
    return <div className="flex items-center justify-center h-screen text-red-400">接続エラー。ページを再読み込みしてください。</div>
  }
  if (phase === 'WAITING' || !gameState) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-slate-300">
        <p>プレイヤーを待っています...</p>
        <p className="text-slate-500 text-sm">ルームID: {roomId}</p>
      </div>
    )
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
            onSelect={isMyTurn && !hasActed ? handleCardSelect : undefined}
            size="md"
            isMobile
          />
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <ActionPanel
              isMyTurn={isMyTurn}
              hasActed={hasActed}
              canDrawDeck={canDrawDeck}
              canDrawDiscard={canDrawDiscard}
              selectedCount={selectedIndices.length}
              hasUsedSpecial={hasUsedSpecial}
              onDraw={handleDraw}
              onDiscard={handleDiscard}
              onDiscardMultiple={handleDiscardMultiple}
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
        onBackToLobby={() => router.push('/lobby')}
      />
    </div>
  )
}
