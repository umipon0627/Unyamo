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
  status: 'waiting' | 'playing' | 'finished'
}

const rooms = new Map<string, RoomMeta>()

export function createRoom(meta: Omit<RoomMeta, 'createdAt' | 'status'>): RoomMeta {
  const room: RoomMeta = { ...meta, createdAt: Date.now(), status: 'waiting' }
  rooms.set(room.id, room)
  return room
}

export function getRoom(id: string): RoomMeta | undefined {
  return rooms.get(id)
}

export function listRooms(): RoomMeta[] {
  return Array.from(rooms.values())
    .filter(r => r.status !== 'finished')
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function deleteRoom(id: string): boolean {
  return rooms.delete(id)
}

export function updateRoomPlayers(id: string, count: number): void {
  const room = rooms.get(id)
  if (room) room.currentPlayers = count
}
