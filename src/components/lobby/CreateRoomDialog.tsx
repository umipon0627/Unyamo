'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreateRoomDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [isPrivate, setIsPrivate] = useState(false)
  const [password, setPassword] = useState('')
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
      <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpen(true)}>
        ルームを作成
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-emerald-400">新しいルームを作成</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="roomName" className="text-slate-300">ルーム名</Label>
            <Input
              id="roomName"
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              placeholder="例: 友達と遊ぼう"
              maxLength={30}
              className="bg-slate-700 border-slate-600 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-slate-300">最大人数</Label>
            <div className="flex gap-2 mt-1">
              {[3, 4, 5, 6, 7, 8].map(n => (
                <button
                  key={n}
                  onClick={() => setMaxPlayers(n)}
                  className={`w-9 h-9 rounded text-sm font-bold transition-colors ${
                    maxPlayers === n
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={e => setIsPrivate(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="isPrivate" className="text-slate-300 cursor-pointer">
              プライベートルーム（パスワード設定）
            </Label>
          </div>
          {isPrivate && (
            <div>
              <Label htmlFor="password" className="text-slate-300">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="4〜20文字"
                maxLength={20}
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
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
