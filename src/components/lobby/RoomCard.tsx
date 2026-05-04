'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  return (
    <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base text-slate-100 truncate">{room.name}</CardTitle>
          <div className="flex gap-1 flex-shrink-0">
            {room.isPrivate && (
              <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                鍵付き
              </Badge>
            )}
            <Badge
              className={cn(
                'text-xs',
                isWaiting ? 'bg-emerald-600' : 'bg-slate-600',
              )}
            >
              {isWaiting ? '募集中' : 'ゲーム中'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-slate-400 space-y-0.5">
            <p>ホスト: {room.hostName}</p>
            <p className={cn(isFull && 'text-red-400')}>
              {room.currentPlayers} / {room.maxPlayers} 人
            </p>
          </div>
          <div className="flex flex-col gap-1.5 items-end">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => onJoin(room.id)}
              disabled={isFull || !isWaiting}
            >
              参加
            </Button>
            {isHost && (
              <Button
                size="sm"
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
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
          <p className="text-red-400 text-xs mt-2" role="alert">{deleteError}</p>
        )}
      </CardContent>
    </Card>
  )
}
