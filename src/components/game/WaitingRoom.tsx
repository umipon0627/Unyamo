'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface WaitingPlayer {
  id: string
  name: string
  isConnected: boolean
}

interface WaitingRoomProps {
  roomId: string
  roomName: string
  players: WaitingPlayer[]
  hostId: string
  maxPlayers: number
  myPlayerId: string
  canStartGame: boolean
  onStartGame: () => void
  onLeaveRoom?: () => void
}

const MIN_PLAYERS = 2

export function WaitingRoom({
  roomId,
  roomName,
  players,
  hostId,
  maxPlayers,
  myPlayerId,
  canStartGame,
  onStartGame,
  onLeaveRoom,
}: WaitingRoomProps) {
  const isHost = myPlayerId === hostId
  const slots = Array.from({ length: maxPlayers })
  const remaining = MIN_PLAYERS - players.length
  const canStart = players.length >= MIN_PLAYERS
  const [copied, setCopied] = useState(false)

  async function handleCopyRoomId() {
    try {
      // 招待用にルームIDをクリップボードへコピー
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(roomId)
      } else {
        // フォールバック: textarea経由でコピー
        const textarea = document.createElement('textarea')
        textarea.value = roomId
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // コピー失敗時は無視（UI表示はそのまま）
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4">
      {/* ヘッダー */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-100">{roomName}</h1>
        <div className="mt-2 flex items-center justify-center gap-2">
          <p className="text-slate-500 text-sm">
            ルームID: <span className="font-mono text-slate-300">{roomId}</span>
          </p>
          <button
            type="button"
            onClick={handleCopyRoomId}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              copied
                ? 'border-emerald-500 text-emerald-300 bg-emerald-900/30'
                : 'border-slate-600 text-slate-300 hover:bg-slate-700'
            }`}
            aria-label="ルームIDをコピー"
          >
            {copied ? 'コピーしました' : 'IDをコピー'}
          </button>
        </div>
        <p className="text-slate-600 text-xs mt-1">
          このIDを友達に共有すると、ロビーの「ルームIDで参加」から参加できます
        </p>
      </div>

      {/* プレイヤースロットグリッド */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full max-w-2xl mb-8">
        <AnimatePresence>
          {slots.map((_, index) => {
            const player = players[index]
            if (player) {
              const initials = player.name.charAt(0).toUpperCase()
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center gap-2 bg-slate-800 rounded-lg p-3 border border-slate-700"
                >
                  {/* アバターと接続ドット */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center text-lg font-bold text-slate-200">
                      {initials}
                    </div>
                    {/* 接続状態ドット */}
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-800 ${
                        player.isConnected
                          ? 'bg-green-500 animate-pulse'
                          : 'bg-slate-500'
                      }`}
                    />
                  </div>

                  {/* 名前 */}
                  <p className="text-slate-200 text-sm font-medium text-center truncate w-full">
                    {player.name}
                  </p>

                  {/* バッジ */}
                  <div className="flex flex-wrap gap-1 justify-center">
                    {player.id === hostId && (
                      <Badge className="bg-amber-500 text-amber-950 text-xs px-1.5 py-0.5">
                        ホスト
                      </Badge>
                    )}
                    {player.id === myPlayerId && (
                      <Badge className="bg-blue-500 text-blue-950 text-xs px-1.5 py-0.5">
                        あなた
                      </Badge>
                    )}
                  </div>
                </motion.div>
              )
            }

            // 空きスロット
            return (
              <motion.div
                key={`empty-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="flex flex-col items-center justify-center gap-2 bg-slate-800/50 rounded-lg p-3 border-2 border-dashed border-slate-700 min-h-[120px]"
              >
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-600 animate-pulse" />
                <p className="text-slate-500 text-sm">待機中...</p>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* 状態テキスト */}
      <p
        className={`text-sm font-medium mb-6 ${
          canStart ? 'text-emerald-500' : 'text-amber-500'
        }`}
      >
        {canStart
          ? 'ゲーム開始可能！'
          : `あと${remaining}人で開始可能`}
      </p>

      {/* フッター */}
      <div className="flex flex-col items-center gap-3">
        {isHost ? (
          <Button
            onClick={onStartGame}
            disabled={!canStartGame}
            className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold px-8 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ゲームを開始
          </Button>
        ) : (
          <p className="text-slate-400 text-sm">ホストの開始を待っています...</p>
        )}

        {onLeaveRoom && (
          <button
            onClick={onLeaveRoom}
            className="text-slate-500 hover:text-slate-300 text-xs underline transition-colors"
          >
            ロビーに戻る
          </button>
        )}
      </div>
    </div>
  )
}
