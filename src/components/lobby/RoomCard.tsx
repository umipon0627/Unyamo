'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RoomCardProps {
  room: {
    id: string
    name: string
    hostId: string
    hostName: string
    maxPlayers: number
    currentPlayers: number
    isPrivate: boolean
    status: string
  }
  currentUserId?: string
  onJoin: (roomId: string) => void
  onDeleted?: () => void
}

export function RoomCard({ room, currentUserId, onJoin, onDeleted }: RoomCardProps) {
  const isFull = room.currentPlayers >= room.maxPlayers
  const isWaiting = room.status === 'waiting'
  const isHost = currentUserId !== undefined && currentUserId === room.hostId
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleDelete() {
    if (!isHost) return
    if (!window.confirm(`ルーム「${room.name}」を削除します。よろしいですか？`)) return
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(room.id)}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDeleteError(data?.error ?? '削除に失敗しました')
        return
      }
      onDeleted?.()
    } catch {
      setDeleteError('ネットワークエラーが発生しました')
    } finally {
      setDeleting(false)
    }
  }

  // 状態別の左色帯カラー
  const statusBarColor = isWaiting
    ? isFull
      ? 'bg-unyam-red'
      : 'bg-unyam-green-bright'
    : 'bg-unyam-ink-muted'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: '0 8px 24px -6px rgba(40,30,20,.14)' }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="relative flex overflow-hidden rounded-2xl bg-unyam-surface border border-unyam-border shadow-sm"
      style={{ boxShadow: '0 4px 16px -4px rgba(40,30,20,.12)' }}
    >
      {/* 左色帯（状態表現） */}
      <div
        className={cn('w-1.5 flex-shrink-0', statusBarColor)}
        aria-hidden="true"
      />

      {/* カード本体 */}
      <div className="flex-1 p-3">
        {/* ルーム名 + バッジ行 */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="font-heading font-bold text-unyam-ink text-sm leading-tight truncate max-w-[140px]">
            {room.name}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {room.isPrivate && (
              <Badge
                variant="outline"
                className="border-unyam-border text-unyam-ink-muted text-[10px] px-1.5 py-0"
                aria-label="プライベートルーム"
              >
                鍵付き
              </Badge>
            )}
            <Badge
              className={cn(
                'text-[10px] px-1.5 py-0',
                isWaiting && !isFull
                  ? 'bg-unyam-green-bright text-white'
                  : isWaiting && isFull
                    ? 'bg-unyam-red text-white'
                    : 'bg-unyam-ink-muted text-white',
              )}
              aria-label={isWaiting ? (isFull ? '満員' : '募集中') : 'ゲーム中'}
            >
              {isWaiting ? (isFull ? '満員' : '募集中') : 'ゲーム中'}
            </Badge>
          </div>
        </div>

        {/* ホスト名 / 人数 / ボタン行 */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-unyam-ink-muted space-y-0.5 min-w-0">
            <p className="truncate">
              <span className="font-medium">HOST</span>
              {' '}
              {room.hostName}
            </p>
            <p className={cn(isFull ? 'text-unyam-red font-semibold' : '')}>
              {room.currentPlayers} / {room.maxPlayers} 人
            </p>
          </div>

          <div className="flex flex-col gap-1 items-end">
            <Button
              size="sm"
              onClick={() => onJoin(room.id)}
              disabled={isFull || !isWaiting}
              className={cn(
                'rounded-full text-xs h-7 px-3 font-heading font-bold transition-all',
                isFull || !isWaiting
                  ? 'bg-unyam-border text-unyam-ink-muted cursor-not-allowed'
                  : 'bg-unyam-green text-white hover:bg-unyam-green/90',
              )}
              aria-label={`${room.name} に参加`}
            >
              {isFull ? '満員' : '参加'}
            </Button>
            {isHost && (
              <Button
                size="sm"
                variant="destructive"
                className="rounded-full text-[10px] h-6 px-2.5 font-bold bg-unyam-red hover:bg-unyam-red/90 text-white"
                onClick={handleDelete}
                disabled={deleting}
                aria-label={`ルーム「${room.name}」を削除`}
              >
                {deleting ? '削除中...' : '削除'}
              </Button>
            )}
          </div>
        </div>

        {deleteError && (
          <p className="text-unyam-red text-xs mt-2" role="alert">{deleteError}</p>
        )}
      </div>
    </motion.div>
  )
}
