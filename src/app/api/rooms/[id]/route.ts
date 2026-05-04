export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getRoom, deleteRoom } from '@/lib/room-store'
import { checkRateLimit } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/current-user'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
}

// GET /api/rooms/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(getIp(req), user.id)
  if (!rl.allowed) return NextResponse.json({ error: rl.reason }, { status: 429 })

  const room = getRoom(id)
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

// POST /api/rooms/[id] — パスワード検証
const verifyPasswordSchema = z.object({ password: z.string().min(1) })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(getIp(req), user.id)
  if (!rl.allowed) return NextResponse.json({ error: rl.reason }, { status: 429 })

  const body = await req.json().catch(() => null)
  const parsed = verifyPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const room = getRoom(id)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  if (!room.isPrivate) {
    return NextResponse.json({ ok: true })
  }

  const match = await bcrypt.compare(parsed.data.password, room.passwordHash ?? '')
  if (!match) {
    return NextResponse.json({ ok: false, error: 'パスワードが違います' }, { status: 403 })
  }
  return NextResponse.json({ ok: true })
}

// DELETE /api/rooms/[id] — ホストのみ
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const room = getRoom(id)
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.hostId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  deleteRoom(id)
  return NextResponse.json({ success: true })
}
