import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  createRoom, getRoom, listRooms, deleteRoom,
  updateRoomPlayers, touchRoom,
  ROOM_IDLE_TIMEOUT_MS, _resetRoomStoreForTest,
} from '@/lib/room-store'

describe('room-store', () => {
  beforeEach(() => {
    _resetRoomStoreForTest()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates and retrieves a room', () => {
    const room = createRoom({
      id: 'r1', name: 'Test', hostId: 'u1', hostName: 'Alice',
      maxPlayers: 4, currentPlayers: 1, isPrivate: false,
    })
    expect(room.status).toBe('waiting')
    expect(room.lastActiveAt).toBe(room.createdAt)
    expect(getRoom('r1')).toBeDefined()
  })

  it('lists rooms sorted by createdAt desc, excluding finished', () => {
    createRoom({ id: 'a', name: 'A', hostId: 'u', hostName: 'h', maxPlayers: 4, currentPlayers: 1, isPrivate: false })
    vi.advanceTimersByTime(10)
    createRoom({ id: 'b', name: 'B', hostId: 'u', hostName: 'h', maxPlayers: 4, currentPlayers: 1, isPrivate: false })
    const rooms = listRooms()
    expect(rooms.map(r => r.id)).toEqual(['b', 'a'])
  })

  it('deletes a room manually', () => {
    createRoom({ id: 'x', name: 'X', hostId: 'u', hostName: 'h', maxPlayers: 4, currentPlayers: 1, isPrivate: false })
    expect(deleteRoom('x')).toBe(true)
    expect(getRoom('x')).toBeUndefined()
  })

  it('auto-removes idle rooms when listRooms is called after timeout', () => {
    createRoom({ id: 'idle', name: 'Idle', hostId: 'u', hostName: 'h', maxPlayers: 4, currentPlayers: 0, isPrivate: false })
    expect(listRooms()).toHaveLength(1)

    // advance just under threshold
    vi.advanceTimersByTime(ROOM_IDLE_TIMEOUT_MS - 1000)
    expect(listRooms()).toHaveLength(1)

    // advance past threshold
    vi.advanceTimersByTime(2000)
    expect(listRooms()).toHaveLength(0)
    expect(getRoom('idle')).toBeUndefined()
  })

  it('keeps rooms alive when touchRoom is called', () => {
    createRoom({ id: 'active', name: 'Active', hostId: 'u', hostName: 'h', maxPlayers: 4, currentPlayers: 1, isPrivate: false })
    vi.advanceTimersByTime(ROOM_IDLE_TIMEOUT_MS - 60_000)
    touchRoom('active')
    vi.advanceTimersByTime(ROOM_IDLE_TIMEOUT_MS - 60_000)
    // Even though absolute elapsed time exceeds threshold, lastActiveAt was refreshed
    expect(listRooms()).toHaveLength(1)
  })

  it('updateRoomPlayers refreshes lastActiveAt', () => {
    createRoom({ id: 'r', name: 'R', hostId: 'u', hostName: 'h', maxPlayers: 4, currentPlayers: 1, isPrivate: false })
    vi.advanceTimersByTime(ROOM_IDLE_TIMEOUT_MS - 60_000)
    updateRoomPlayers('r', 2)
    vi.advanceTimersByTime(ROOM_IDLE_TIMEOUT_MS - 60_000)
    const rooms = listRooms()
    expect(rooms).toHaveLength(1)
    expect(rooms[0]?.currentPlayers).toBe(2)
  })
})
