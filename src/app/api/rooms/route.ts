export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createRoomSchema } from '@/lib/schemas'
import { createRoom, listRooms } from '@/lib/room-store'
import { checkRateLimit, checkRoomCreationLimit } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/current-user'
import { escapeHtml } from '@/lib/utils'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
}

// GET /api/rooms — ルーム一覧
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(getIp(req), user.id)
  if (!rl.allowed) return NextResponse.json({ error: rl.reason }, { status: 429 })

  const rooms = listRooms().map(r => ({
    id: r.id,
    name: r.name,
    hostId: r.hostId,
    hostName: r.hostName,
    maxPlayers: r.maxPlayers,
    currentPlayers: r.currentPlayers,
    isPrivate: r.isPrivate,
    status: r.status,
    createdAt: r.createdAt,
  }))
  return NextResponse.json({ rooms })
}

// POST /api/rooms — ルーム作成
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(getIp(req), user.id)
  if (!rl.allowed) return NextResponse.json({ error: rl.reason }, { status: 429 })

  if (!checkRoomCreationLimit(user.id)) {
    return NextResponse.json({ error: 'Room creation limit exceeded (5/hour)' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createRoomSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
  }

  const { roomName, maxPlayers, isPrivate, password } = parsed.data
  const room = createRoom({
    id: randomUUID(),
    name: escapeHtml(roomName),
    hostId: user.id,
    hostName: escapeHtml(user.name),
    maxPlayers,
    currentPlayers: 1,
    isPrivate,
    passwordHash: password ? await bcrypt.hash(password, 10) : undefined,
  })

  return NextResponse.json({ room: { id: room.id, name: room.name } }, { status: 201 })
}
