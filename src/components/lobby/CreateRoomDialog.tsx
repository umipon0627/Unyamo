'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ルームカラーチップの選択肢（アクセントカラー）
const ROOM_COLORS = [
  { label: 'グリーン', value: 'green', bg: 'bg-unyam-green', border: 'border-unyam-green' },
  { label: 'ネイビー', value: 'navy', bg: 'bg-unyam-navy-base', border: 'border-unyam-navy-base' },
  { label: 'ゴールド', value: 'gold', bg: 'bg-unyam-gold', border: 'border-unyam-gold' },
  { label: 'レッド', value: 'red', bg: 'bg-unyam-red', border: 'border-unyam-red' },
  { label: 'ティール', value: 'teal', bg: 'bg-unyam-teal', border: 'border-unyam-teal' },
]

export function CreateRoomDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [isPrivate, setIsPrivate] = useState(false)
  const [password, setPassword] = useState('')
  const [selectedColor, setSelectedColor] = useState('green')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!roomName.trim()) { setError('ルーム名を入力してください'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: roomName.trim(), maxPlayers, isPrivate, password: isPrivate ? password : undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? '作成に失敗しました'); return }
      setOpen(false)
      router.push(`/room/${data.room.id}`)
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        className="rounded-full bg-unyam-green text-white hover:bg-unyam-green/90 font-heading font-bold px-4"
        onClick={() => setOpen(true)}
      >
        ルームを作成
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-unyam-surface border-unyam-border rounded-3xl max-w-sm shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-unyam-ink text-xl">
              新しいルームを作成
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-1">
            {/* ルーム名 */}
            <div>
              <Label
                htmlFor="roomName"
                className="text-unyam-ink text-sm font-medium mb-1.5 block"
              >
                ルーム名
              </Label>
              <Input
                id="roomName"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                placeholder="例: 友達と遊ぼう"
                maxLength={30}
                className="rounded-xl border-unyam-border bg-unyam-cream text-unyam-ink placeholder:text-unyam-ink-muted/60"
              />
            </div>

            {/* カラーチップ */}
            <div>
              <Label className="text-unyam-ink text-sm font-medium mb-2 block">
                テーマカラー
              </Label>
              <div className="flex gap-2">
                {ROOM_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setSelectedColor(c.value)}
                    aria-label={c.label}
                    aria-pressed={selectedColor === c.value}
                    className={cn(
                      'w-8 h-8 rounded-full transition-all border-2',
                      c.bg,
                      selectedColor === c.value
                        ? `${c.border} ring-2 ring-offset-2 ring-offset-unyam-surface scale-110`
                        : 'border-transparent opacity-70 hover:opacity-100',
                    )}
                  />
                ))}
              </div>
            </div>

            {/* 最大人数 */}
            <div>
              <Label className="text-unyam-ink text-sm font-medium mb-2 block">
                最大人数
              </Label>
              <div className="flex gap-1.5 flex-wrap">
                {[2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMaxPlayers(n)}
                    aria-pressed={maxPlayers === n}
                    className={cn(
                      'w-9 h-9 rounded-full text-sm font-heading font-bold transition-all border',
                      maxPlayers === n
                        ? 'bg-unyam-green text-white border-unyam-green shadow-sm'
                        : 'bg-unyam-cream text-unyam-ink border-unyam-border hover:border-unyam-green hover:text-unyam-green',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* 公開/非公開トグル */}
            <div>
              <Label className="text-unyam-ink text-sm font-medium mb-2 block">
                公開設定
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  aria-pressed={!isPrivate}
                  className={cn(
                    'flex-1 py-2 rounded-full text-sm font-heading font-bold border transition-all',
                    !isPrivate
                      ? 'bg-unyam-green text-white border-unyam-green'
                      : 'bg-unyam-cream text-unyam-ink-muted border-unyam-border hover:border-unyam-green',
                  )}
                >
                  公開
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  aria-pressed={isPrivate}
                  className={cn(
                    'flex-1 py-2 rounded-full text-sm font-heading font-bold border transition-all',
                    isPrivate
                      ? 'bg-unyam-navy-base text-white border-unyam-navy-base'
                      : 'bg-unyam-cream text-unyam-ink-muted border-unyam-border hover:border-unyam-navy-base',
                  )}
                >
                  非公開（PIN）
                </button>
              </div>
            </div>

            {/* PINパスワード（非公開選択時） */}
            {isPrivate && (
              <div>
                <Label
                  htmlFor="password"
                  className="text-unyam-ink text-sm font-medium mb-1.5 block"
                >
                  パスワード
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="4〜20文字"
                    maxLength={20}
                    className="rounded-xl border-unyam-border bg-unyam-cream text-unyam-ink placeholder:text-unyam-ink-muted/60 tracking-widest font-mono"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-unyam-red text-sm font-medium" role="alert">
                {error}
              </p>
            )}

            <Button
              className="w-full rounded-full bg-unyam-green text-white hover:bg-unyam-green/90 font-heading font-bold py-2.5"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? '作成中...' : '作成して入室'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
