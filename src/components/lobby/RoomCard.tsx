'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RoomCardProps {
  room: {
    id: string
    name: string
    hostName: string
    maxPlayers: number
    currentPlayers: number
    isPrivate: boolean
    status: string
  }
  onJoin: (roomId: string) => void
}

export function RoomCard({ room, onJoin }: RoomCardProps) {
  const isFull = room.currentPlayers >= room.maxPlayers
  const isWaiting = room.status === 'waiting'

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
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400 space-y-0.5">
            <p>ホスト: {room.hostName}</p>
            <p className={cn(isFull && 'text-red-400')}>
              {room.currentPlayers} / {room.maxPlayers} 人
            </p>
          </div>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => onJoin(room.id)}
            disabled={isFull || !isWaiting}
          >
            参加
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
