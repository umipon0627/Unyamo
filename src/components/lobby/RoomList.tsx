'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RoomCard } from './RoomCard'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface RoomItem {
  id: string
  name: string
  hostId: string
  hostName: string
  maxPlayers: number
  currentPlayers: number
  isPrivate: boolean
  status: string
}

async function fetchRoomsApi(): Promise<RoomItem[]> {
  const res = await fetch('/api/rooms')
  if (!res.ok) throw new Error('Failed to fetch')
  const data = await res.json() as { rooms: RoomItem[] }
  return data.rooms ?? []
}

interface RoomListProps {
  currentUserId?: string
}

export function RoomList({ currentUserId }: RoomListProps) {
  const router = useRouter()
  const [rooms, setRooms] = useState<RoomItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const initialized = useRef(false)

  // パスワードダイアログ状態
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null)
  const [pendingRoomName, setPendingRoomName] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [verifying, setVerifying] = useState(false)

  const refresh = useCallback(() => {
    fetchRoomsApi()
      .then(data => { setRooms(data) })
      .catch(() => { setError('ルーム一覧の取得に失敗しました') })
  }, [])

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      fetchRoomsApi()
        .then(data => { setRooms(data); setLoading(false) })
        .catch(() => { setError('ルーム一覧の取得に失敗しました'); setLoading(false) })
    }
    const id = setInterval(refresh, 5000) // 5秒ポーリング
    return () => clearInterval(id)
  }, [refresh])

  const handleJoin = useCallback((id: string) => {
    const room = rooms.find(r => r.id === id)
    if (!room) return

    if (!room.isPrivate) {
      router.push(`/room/${id}`)
      return
    }

    // プライベートルームはパスワードダイアログを開く
    setPendingRoomId(id)
    setPendingRoomName(room.name)
    setPasswordInput('')
    setPasswordError('')
    setDialogOpen(true)
  }, [rooms, router])

  const handlePasswordSubmit = useCallback(async () => {
    if (!pendingRoomId) return
    if (!passwordInput) {
      setPasswordError('パスワードを入力してください')
      return
    }

    setVerifying(true)
    setPasswordError('')

    try {
      const res = await fetch(`/api/rooms/${pendingRoomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      })

      if (res.ok) {
        setDialogOpen(false)
        router.push(`/room/${pendingRoomId}`)
      } else if (res.status === 403) {
        const data = await res.json() as { ok: boolean; error?: string }
        setPasswordError(data.error ?? 'パスワードが違います')
      } else if (res.status === 429) {
        setPasswordError('リクエストが多すぎます。しばらく待ってから再試行してください。')
      } else {
        setPasswordError('エラーが発生しました。再試行してください。')
      }
    } catch {
      setPasswordError('ネットワークエラーが発生しました。')
    } finally {
      setVerifying(false)
    }
  }, [pendingRoomId, passwordInput, router])

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setPendingRoomId(null)
      setPendingRoomName('')
      setPasswordInput('')
      setPasswordError('')
    }
  }, [])

  if (loading) {
    return <p className="text-slate-400 text-center py-8">読み込み中...</p>
  }
  if (error) {
    return <p className="text-red-400 text-center py-8">{error}</p>
  }
  if (rooms.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 mb-2">募集中のルームがありません</p>
        <p className="text-slate-500 text-sm">最初のルームを作成しましょう！</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rooms.map(room => (
          <RoomCard
            key={room.id}
            room={room}
            currentUserId={currentUserId}
            onJoin={handleJoin}
            onDeleted={refresh}
          />
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>パスワードを入力</DialogTitle>
            <DialogDescription>
              「{pendingRoomName}」はプライベートルームです。参加にはパスワードが必要です。
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="room-password">パスワード</Label>
            <Input
              id="room-password"
              type="password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handlePasswordSubmit() }}
              placeholder="パスワードを入力してください"
              aria-invalid={passwordError !== '' ? true : undefined}
            />
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={verifying}
            >
              キャンセル
            </Button>
            <Button
              onClick={() => void handlePasswordSubmit()}
              disabled={verifying || !passwordInput}
            >
              {verifying ? '確認中...' : '参加する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
