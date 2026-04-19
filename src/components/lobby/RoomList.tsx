'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RoomCard } from './RoomCard'

interface RoomItem {
  id: string
  name: string
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

export function RoomList() {
  const router = useRouter()
  const [rooms, setRooms] = useState<RoomItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const initialized = useRef(false)

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {rooms.map(room => (
        <RoomCard key={room.id} room={room} onJoin={id => router.push(`/room/${id}`)} />
      ))}
    </div>
  )
}
