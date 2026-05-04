'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * ロビー画面の「ルームIDで参加」ダイアログ。
 *
 * - 招待されたユーザーがホストから受け取ったルームIDを直接入力して参加できる
 * - 空文字 / スペースのみは弾く
 * - 入力されたIDをURLエンコードして /room/[id] へ遷移する
 */
export function JoinRoomDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [error, setError] = useState('')

  function handleJoin() {
    const trimmed = roomId.trim()
    if (!trimmed) {
      setError('ルームIDを入力してください')
      return
    }
    // ID には英数字とハイフン・アンダースコアのみを想定。
    // それ以外の文字（スペース、URL予約文字など）は弾く。
    if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
      setError('ルームIDは英数字・ハイフン・アンダースコアのみ使用できます')
      return
    }
    setError('')
    setOpen(false)
    setRoomId('')
    router.push(`/room/${encodeURIComponent(trimmed)}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleJoin()
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="border-emerald-700 text-emerald-300 hover:bg-emerald-900/30"
        onClick={() => setOpen(true)}
      >
        ルームIDで参加
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-emerald-400">ルームIDで参加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-400 text-xs">
              ホストから共有されたルームIDを入力してください。
            </p>
            <div>
              <Label htmlFor="roomId" className="text-slate-300">ルームID</Label>
              <Input
                id="roomId"
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="例: cabc123def"
                maxLength={64}
                autoFocus
                autoComplete="off"
                className="bg-slate-700 border-slate-600 text-white mt-1 font-mono"
              />
            </div>
            {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={handleJoin}
            >
              参加する
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
