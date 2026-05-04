import { randomUUID } from 'crypto'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/current-user'

const schema = z.object({
  cpuCount: z.number().int().min(1).max(3),
  difficulty: z.enum(['EASY', 'HARD']),
})

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const body: unknown = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid request', details: parsed.error.flatten() }), { status: 400 })
  }

  const { cpuCount, difficulty } = parsed.data

  // ルームIDにユーザーIDを含めるが、特殊文字は除去してURLセーフにする
  const safeUserId = user.id.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)
  const roomId = `cpu-${safeUserId}-${randomUUID().slice(0, 8)}`

  // CPU対戦ルームはRoomStore（ロビー用Prisma）には登録しない
  return new Response(
    JSON.stringify({ roomId, cpuCount, difficulty }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
