'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-unyamo-border border-t-unyamo-green animate-spin" />
        <p className="text-unyamo-ink-muted text-sm">読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-unyamo-red text-sm font-medium">{error}</p>
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 gap-3"
      >
        <div className="w-16 h-16 rounded-full bg-unyamo-border/50 flex items-center justify-center text-3xl">
          🃏
        </div>
        <p className="text-unyamo-ink font-heading font-bold text-base">募集中のルームがありません</p>
        <p className="text-unyamo-ink-muted text-sm">最初のルームを作成しましょう！</p>
      </motion.div>
    )
  }

  return (
    <>
      {/* ルーム件数 */}
      <p className="text-unyamo-ink-muted text-xs mb-3">
        {rooms.length} 件のルームが見つかりました
      </p>

      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {rooms.map(room => (
            <RoomCard
              key={room.id}
              room={room}
              currentUserId={currentUserId}
              onJoin={handleJoin}
              onDeleted={refresh}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* パスワード入力ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="bg-unyamo-surface border-unyamo-border rounded-3xl max-w-sm shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-unyamo-ink text-lg">
              パスワードを入力
            </DialogTitle>
            <DialogDescription className="text-unyamo-ink-muted text-sm">
              「{pendingRoomName}」はプライベートルームです。参加にはパスワードが必要です。
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-1">
            <div>
              <Label
                htmlFor="room-password"
                className="text-unyamo-ink text-sm font-medium mb-1.5 block"
              >
                パスワード
              </Label>
              <Input
                id="room-password"
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handlePasswordSubmit() }}
                placeholder="パスワードを入力してください"
                aria-invalid={passwordError !== '' ? true : undefined}
                className="rounded-xl border-unyamo-border bg-unyamo-cream text-unyamo-ink placeholder:text-unyamo-ink-muted/60"
              />
              {passwordError && (
                <p className="text-sm text-unyamo-red mt-1.5 font-medium" role="alert">
                  {passwordError}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={verifying}
              className="rounded-full border-unyamo-border text-unyamo-ink-muted hover:bg-unyamo-cream font-heading font-bold"
            >
              キャンセル
            </Button>
            <Button
              onClick={() => void handlePasswordSubmit()}
              disabled={verifying || !passwordInput}
              className="rounded-full bg-unyamo-green text-white hover:bg-unyamo-green/90 font-heading font-bold"
            >
              {verifying ? '確認中...' : '参加する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
