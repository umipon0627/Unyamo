import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(getIp(req), session.user.id)
  if (!rl.allowed) return NextResponse.json({ error: rl.reason }, { status: 429 })

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        gamesPlayed: true,
        gamesWon: true,
        gamesLost: true,
        totalScore: true,
        gameResults: {
          orderBy: { gameRecord: { createdAt: 'desc' } },
          take: 10,
          select: {
            finalScore: true,
            rank: true,
            declared: true,
            isWinner: true,
            gameRecord: { select: { playerCount: true, duration: true, createdAt: true } },
          },
        },
      },
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const winRate = user.gamesPlayed > 0
      ? Math.round((user.gamesWon / user.gamesPlayed) * 100)
      : 0

    return NextResponse.json({
      stats: {
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        gamesLost: user.gamesLost,
        winRate,
        totalScore: user.totalScore,
        recentGames: user.gameResults,
      },
    })
  } catch {
    // DB未接続環境ではデフォルト値を返す
    return NextResponse.json({
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        winRate: 0,
        totalScore: 0,
        recentGames: [],
      },
    })
  }
}
