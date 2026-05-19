'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

// アバターの背景色をプレイヤーIDから決定論的に生成
const AVATAR_COLORS = [
  'bg-unyamo-green text-white',
  'bg-unyamo-navy-base text-white',
  'bg-unyamo-gold text-unyamo-ink',
  'bg-unyamo-red text-white',
  'bg-unyamo-teal text-white',
]

function getAvatarColor(playerId: string): string {
  let hash = 0
  for (let i = 0; i < playerId.length; i++) {
    hash = (hash * 31 + playerId.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]!
}

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-unyamo-cream p-4">
      {/* ヘッダーカード */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="w-full max-w-md bg-unyamo-surface rounded-3xl border border-unyamo-border shadow-sm px-5 py-4 mb-4"
        style={{ boxShadow: '0 6px 20px -6px rgba(40,30,20,.14)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-unyamo-ink text-xl leading-tight truncate">
              {roomName}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className="text-unyamo-ink-muted text-xs font-mono"
                title={roomId}
              >
                ID: {roomId.length > 12 ? `${roomId.slice(0, 8)}…` : roomId}
              </span>
              <button
                type="button"
                onClick={handleCopyRoomId}
                aria-label="ルームIDをコピー"
                className={cn(
                  'text-xs px-2.5 py-0.5 rounded-full border font-medium transition-all',
                  copied
                    ? 'border-unyamo-green text-unyamo-green bg-unyamo-green/10'
                    : 'border-unyamo-border text-unyamo-ink-muted hover:border-unyamo-green hover:text-unyamo-green',
                )}
              >
                {copied ? 'コピー済み！' : 'IDをコピー'}
              </button>
            </div>
            <p className="text-unyamo-ink-muted text-xs mt-1">
              このIDを友達に共有すると、ロビーの「ルームIDで参加」から参加できます
            </p>
          </div>
          {/* 人数バッジ */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <span
              className={cn(
                'text-2xl font-heading font-bold leading-none',
                canStart ? 'text-unyamo-green' : 'text-unyamo-gold',
              )}
            >
              {players.length}
            </span>
            <span className="text-unyamo-ink-muted text-xs">/ {maxPlayers}</span>
          </div>
        </div>
      </motion.div>

      {/* プレイヤーリスト */}
      <div className="w-full max-w-md mb-4 space-y-2">
        <AnimatePresence initial={false}>
          {players.map((player, index) => {
            const isMe = player.id === myPlayerId
            const isPlayerHost = player.id === hostId
            const initials = player.name.charAt(0).toUpperCase()
            const avatarColor = getAvatarColor(player.id)

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                  delay: index * 0.05,
                }}
                className={cn(
                  'flex items-center gap-3 bg-unyamo-surface rounded-2xl border px-4 py-3',
                  isMe
                    ? 'border-unyamo-green/60 bg-unyamo-green/5'
                    : 'border-unyamo-border',
                )}
                style={{ boxShadow: '0 2px 8px -2px rgba(40,30,20,.08)' }}
              >
                {/* アバター */}
                <div className="relative flex-shrink-0">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-base font-heading font-bold',
                      avatarColor,
                    )}
                    aria-hidden="true"
                  >
                    {initials}
                  </div>
                  {/* 接続状態ドット */}
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-unyamo-surface',
                      player.isConnected
                        ? 'bg-unyamo-green-bright'
                        : 'bg-unyamo-ink-muted',
                    )}
                    aria-label={player.isConnected ? 'オンライン' : 'オフライン'}
                  />
                </div>

                {/* 名前 + タグ */}
                <div className="flex-1 min-w-0">
                  <p className="text-unyamo-ink font-medium text-sm truncate">
                    {player.name}
                  </p>
                  <div className="flex gap-1 mt-0.5">
                    {isPlayerHost && (
                      <Badge
                        className="bg-unyamo-gold text-unyamo-ink text-[10px] px-1.5 py-0 font-bold leading-4"
                        aria-label="ホスト"
                      >
                        HOST
                      </Badge>
                    )}
                    {isMe && (
                      <Badge
                        className="bg-unyamo-navy-base text-white text-[10px] px-1.5 py-0 font-bold leading-4"
                        aria-label="あなた"
                      >
                        YOU
                      </Badge>
                    )}
                  </div>
                </div>

                {/* READY / WAIT ステータス */}
                <div className="flex-shrink-0">
                  {player.isConnected ? (
                    <span
                      className="text-xs font-heading font-bold text-unyamo-green-bright bg-unyamo-green/10 px-2.5 py-1 rounded-full"
                      aria-label="準備完了"
                    >
                      READY
                    </span>
                  ) : (
                    <span
                      className="text-xs font-heading font-bold text-unyamo-ink-muted bg-unyamo-border/60 px-2.5 py-1 rounded-full"
                      aria-label="待機中"
                    >
                      WAIT
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* 空きスロット表示 */}
        {Array.from({ length: maxPlayers - players.length }).map((_, i) => (
          <motion.div
            key={`empty-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: (players.length + i) * 0.05 }}
            className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-unyamo-border/60 px-4 py-3"
            aria-label="空きスロット"
          >
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-unyamo-border bg-unyamo-border/20" />
            <p className="text-unyamo-ink-muted text-sm">待機中...</p>
          </motion.div>
        ))}
      </div>

      {/* 状態メッセージ */}
      <motion.p
        key={canStart ? 'ready' : 'waiting'}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'text-sm font-heading font-bold mb-5',
          canStart ? 'text-unyamo-green' : 'text-unyamo-gold',
        )}
      >
        {canStart
          ? 'ゲーム開始可能！'
          : `あと ${remaining} 人で開始可能`}
      </motion.p>

      {/* フッターアクション */}
      <div className="flex flex-col items-center gap-3 w-full max-w-md">
        {isHost ? (
          <Button
            onClick={onStartGame}
            disabled={!canStartGame}
            className="w-full rounded-full bg-unyamo-gold text-unyamo-ink hover:bg-unyamo-gold/90 font-heading font-bold text-base py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ boxShadow: canStartGame ? '0 4px 16px -4px rgba(229,182,73,.5)' : undefined }}
          >
            ゲームを開始
          </Button>
        ) : (
          <div className="w-full rounded-full bg-unyamo-surface border border-unyamo-border py-3 text-center">
            <p className="text-unyamo-ink-muted text-sm font-medium">
              ホストの開始を待っています...
            </p>
          </div>
        )}

        {onLeaveRoom && (
          <button
            type="button"
            onClick={onLeaveRoom}
            className="text-unyamo-ink-muted hover:text-unyamo-red text-xs underline underline-offset-2 transition-colors"
          >
            ロビーに戻る
          </button>
        )}
      </div>
    </div>
  )
}
