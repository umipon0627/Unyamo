export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/current-user'

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(getIp(req), user.id)
  if (!rl.allowed) return NextResponse.json({ error: rl.reason }, { status: 429 })

  // ゲストはDBに記録を持たないため空の戦績を返す
  if (user.isGuest) {
    return NextResponse.json({
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        winRate: 0,
        totalScore: 0,
        recentGames: [],
        isGuest: true,
      },
    })
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
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

    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const winRate = dbUser.gamesPlayed > 0
      ? Math.round((dbUser.gamesWon / dbUser.gamesPlayed) * 100)
      : 0

    return NextResponse.json({
      stats: {
        gamesPlayed: dbUser.gamesPlayed,
        gamesWon: dbUser.gamesWon,
        gamesLost: dbUser.gamesLost,
        winRate,
        totalScore: dbUser.totalScore,
        recentGames: dbUser.gameResults,
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
