import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getRoom, deleteRoom } from '@/lib/room-store'
import { checkRateLimit } from '@/lib/rate-limit'

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
}

// GET /api/rooms/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(getIp(req), session.user.id)
  if (!rl.allowed) return NextResponse.json({ error: rl.reason }, { status: 429 })

  const room = getRoom(params.id)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  return NextResponse.json({
    room: {
      id: room.id,
      name: room.name,
      hostName: room.hostName,
      maxPlayers: room.maxPlayers,
      currentPlayers: room.currentPlayers,
      isPrivate: room.isPrivate,
      status: room.status,
    },
  })
}

// DELETE /api/rooms/[id] — ホストのみ
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const room = getRoom(params.id)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.hostId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  deleteRoom(params.id)
  return NextResponse.json({ success: true })
}
