import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const resultSchema = z.object({
  roomId: z.string().min(1),
  startedAt: z.number().int().positive(),
  results: z.array(
    z.object({
      playerId: z.string().min(1),
      totalScore: z.number().int().min(0),
      rank: z.number().int().min(1),
      declared: z.boolean(),
      isWinner: z.boolean(),
    })
  ).min(1),
})

export async function POST(req: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret || req.headers.get('x-internal-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = resultSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }

  const { roomId, startedAt, results } = parsed.data

  // ゲスト・CPU以外の登録済みプレイヤーのみ処理対象
  const registeredResults = results.filter(r => !r.playerId.startsWith('guest:') && !r.playerId.startsWith('cpu:'))
  if (registeredResults.length === 0) {
    return NextResponse.json({ ok: true })
  }

  try {
    const duration = Math.floor((Date.now() - startedAt) / 1000)

    await prisma.$transaction(async (tx) => {
      const gameRecord = await tx.gameRecord.create({
        data: {
          roomId,
          // 登録ユーザーのみカウント（ゲストを含む全参加者数の記録はresults.lengthで取れるが
          // 仕様上 playerCount はゲームに参加した全員の人数とする）
          playerCount: results.length,
          duration,
        },
      })

      for (const r of registeredResults) {
        await tx.gameResult.create({
          data: {
            gameRecordId: gameRecord.id,
            userId: r.playerId,
            finalScore: r.totalScore,
            rank: r.rank,
            declared: r.declared,
            isWinner: r.isWinner,
          },
        })

        await tx.user.update({
          where: { id: r.playerId },
          data: {
            gamesPlayed: { increment: 1 },
            gamesWon: r.isWinner ? { increment: 1 } : undefined,
            gamesLost: !r.isWinner ? { increment: 1 } : undefined,
            totalScore: { increment: r.totalScore },
          },
        })
      }
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
