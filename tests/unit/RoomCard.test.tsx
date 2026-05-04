/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RoomCard } from '@/components/lobby/RoomCard'

const baseRoom = {
  id: 'r1',
  name: 'Test Room',
  hostId: 'host-user-id',
  hostName: 'Alice',
  maxPlayers: 4,
  currentPlayers: 1,
  isPrivate: false,
  status: 'waiting',
}

describe('<RoomCard />', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('hides delete button when current user is not the host', () => {
    render(<RoomCard room={baseRoom} currentUserId="other-user" onJoin={() => {}} />)
    expect(screen.queryByRole('button', { name: /削除/ })).toBeNull()
  })

  it('shows delete button when current user is the host', () => {
    render(<RoomCard room={baseRoom} currentUserId="host-user-id" onJoin={() => {}} />)
    expect(screen.getByRole('button', { name: /ルーム.*を削除/ })).toBeTruthy()
  })

  it('calls DELETE /api/rooms/:id and onDeleted callback when delete is confirmed', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    vi.stubGlobal('fetch', fetchMock)

    const onDeleted = vi.fn()
    render(<RoomCard room={baseRoom} currentUserId="host-user-id" onJoin={() => {}} onDeleted={onDeleted} />)

    fireEvent.click(screen.getByRole('button', { name: /ルーム.*を削除/ }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/rooms/r1', { method: 'DELETE' })
      expect(onDeleted).toHaveBeenCalledTimes(1)
    })
  })

  it('shows error when API returns non-OK', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Forbidden' }) })
    vi.stubGlobal('fetch', fetchMock)

    render(<RoomCard room={baseRoom} currentUserId="host-user-id" onJoin={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /ルーム.*を削除/ }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Forbidden')
    })
  })

  it('does not call API if confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<RoomCard room={baseRoom} currentUserId="host-user-id" onJoin={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /ルーム.*を削除/ }))

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
