// ロビー用ルームメタデータ（インメモリ、開発用）
// 本番はSupabaseテーブルに移行可能

export interface RoomMeta {
  id: string
  name: string
  hostId: string
  hostName: string
  maxPlayers: number
  currentPlayers: number
  isPrivate: boolean
  passwordHash?: string
  createdAt: number
  lastActiveAt: number
  status: 'waiting' | 'playing' | 'finished'
}

// アイドルタイムアウト: 20分間アクセスのないルームは自動削除
export const ROOM_IDLE_TIMEOUT_MS = 20 * 60 * 1000

const rooms = new Map<string, RoomMeta>()

/**
 * 古いルーム / 終了済みルームをMapから削除する。
 * リクエスト駆動（listRooms呼び出し時など）で起動するため、
 * Vercelのサーバーレス環境でもタイマーリーク無く動作する。
 */
function cleanupIdleRooms(now: number = Date.now()): number {
  let removed = 0
  for (const [id, room] of rooms) {
    const isIdle = now - room.lastActiveAt > ROOM_IDLE_TIMEOUT_MS
    const isFinished = room.status === 'finished'
    if (isIdle || isFinished) {
      rooms.delete(id)
      removed++
    }
  }
  return removed
}

export function createRoom(meta: Omit<RoomMeta, 'createdAt' | 'lastActiveAt' | 'status'>): RoomMeta {
  const now = Date.now()
  const room: RoomMeta = { ...meta, createdAt: now, lastActiveAt: now, status: 'waiting' }
  rooms.set(room.id, room)
  return room
}

export function getRoom(id: string): RoomMeta | undefined {
  return rooms.get(id)
}

export function listRooms(): RoomMeta[] {
  cleanupIdleRooms()
  return Array.from(rooms.values())
    .filter(r => r.status !== 'finished')
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function deleteRoom(id: string): boolean {
  return rooms.delete(id)
}

export function updateRoomPlayers(id: string, count: number): void {
  const room = rooms.get(id)
  if (room) {
    room.currentPlayers = count
    room.lastActiveAt = Date.now()
  }
}

/**
 * ルームの最終アクティブ時刻を更新する。
 * WebSocket接続イベントなど、ルームが活発に使われていることを示す場面から呼ぶ。
 */
export function touchRoom(id: string): void {
  const room = rooms.get(id)
  if (room) room.lastActiveAt = Date.now()
}

/**
 * テスト用: 内部状態をリセット
 */
export function _resetRoomStoreForTest(): void {
  rooms.clear()
}
