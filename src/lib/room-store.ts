// ロビー用ルームメタデータ（インメモリ、開発用）
// 本番はSupabaseテーブルに移行可能

/**
 * 紛らわしい文字（0/O、1/I/L、5/S 等）を除外した英数字アルファベット（32文字）。
 * 4桁で 32^4 = 約100万通り。短くて目視・口頭・手入力しやすい。
 */
const ROOM_ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/**
 * 指定長さのランダムな英数字ルームIDを生成する（衝突チェックなし）。
 */
export function generateRoomId(length: number = 4): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let id = ''
  for (let i = 0; i < length; i++) {
    id += ROOM_ID_ALPHABET[bytes[i]! % ROOM_ID_ALPHABET.length]
  }
  return id
}

/**
 * 既存ルームと衝突しない短いルームIDを生成する。
 * 4桁で10回試行し、それでも衝突する場合は5桁にフォールバック。
 * 32^4 = 1,048,576 通りあるため、同時稼働ルームが千〜数万台でも実用上ほぼ衝突しない。
 */
export function generateUniqueRoomId(): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = generateRoomId(4)
    if (!rooms.has(id)) return id
  }
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = generateRoomId(5)
    if (!rooms.has(id)) return id
  }
  throw new Error('Failed to generate unique room ID')
}

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
