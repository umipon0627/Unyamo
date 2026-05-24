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
        className="rounded-full border-unyam-border text-unyam-ink hover:bg-unyam-cream hover:border-unyam-green font-heading font-bold px-4"
        onClick={() => setOpen(true)}
      >
        ルームIDで参加
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-unyam-surface border-unyam-border rounded-3xl max-w-sm shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-unyam-ink text-xl">
              ルームIDで参加
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <p className="text-unyam-ink-muted text-sm">
              ホストから共有されたルームIDを入力してください。
            </p>
            <div>
              <Label
                htmlFor="roomId"
                className="text-unyam-ink text-sm font-medium mb-1.5 block"
              >
                ルームID
              </Label>
              <Input
                id="roomId"
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="例: cabc123def"
                maxLength={64}
                autoFocus
                autoComplete="off"
                className="rounded-xl border-unyam-border bg-unyam-cream text-unyam-ink placeholder:text-unyam-ink-muted/60 font-mono tracking-wider"
              />
            </div>
            {error && (
              <p className="text-unyam-red text-sm font-medium" role="alert">
                {error}
              </p>
            )}
            <Button
              className="w-full rounded-full bg-unyam-green text-white hover:bg-unyam-green/90 font-heading font-bold py-2.5"
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
