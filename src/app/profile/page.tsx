import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/current-user'
import { prisma } from '@/lib/db'

type RecentGame = {
  finalScore: number
  rank: number
  declared: boolean
  isWinner: boolean
  gameRecord: { playerCount: number; createdAt: Date }
}

type StatsData = {
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  winRate: number
  totalScore: number
  recentGames: RecentGame[]
}

async function fetchStatsForUser(userId: string): Promise<StatsData | null> {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
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
            gameRecord: { select: { playerCount: true, createdAt: true } },
          },
        },
      },
    })
    if (!dbUser) return null

    const winRate = dbUser.gamesPlayed > 0
      ? Math.round((dbUser.gamesWon / dbUser.gamesPlayed) * 100)
      : 0

    return {
      gamesPlayed: dbUser.gamesPlayed,
      gamesWon: dbUser.gamesWon,
      gamesLost: dbUser.gamesLost,
      winRate,
      totalScore: dbUser.totalScore,
      recentGames: dbUser.gameResults,
    }
  } catch {
    return null
  }
}

export default async function ProfilePage() {
  const user = await getCurrentUser()
  // 未ログイン（ゲストでも通常ユーザーでもない）はログインページへ
  if (!user) redirect('/login')

  const stats = user.isGuest ? null : await fetchStatsForUser(user.id)

  return (
    <div className="flex flex-col min-h-screen bg-slate-900">
      <Header />
      <main className="max-w-2xl mx-auto w-full px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold text-emerald-400">プロフィール</h1>

        {/* ユーザー情報 */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                {!user.isGuest && user.image && (
                  <AvatarImage src={user.image} />
                )}
                <AvatarFallback className="text-xl bg-slate-700 text-slate-200">
                  {user.name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-bold text-slate-100">{user.name}</p>
                {user.email && (
                  <p className="text-slate-400 text-sm">{user.email}</p>
                )}
                {user.isGuest && (
                  <p className="text-amber-400 text-xs mt-1">ゲストユーザー</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 戦績カード */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-300 text-base">戦績</CardTitle>
          </CardHeader>
          <CardContent>
            {user.isGuest ? (
              <p className="text-slate-500 text-sm">
                ゲストは戦績が記録されません。アカウント登録すると戦績が保存されます。
              </p>
            ) : stats === null ? (
              <p className="text-slate-500 text-sm">
                戦績の取得に失敗しました。
              </p>
            ) : (
              <div className="space-y-4">
                {/* 集計サマリー */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatItem label="対戦数" value={stats.gamesPlayed} />
                  <StatItem label="勝利" value={stats.gamesWon} accent="emerald" />
                  <StatItem label="敗北" value={stats.gamesLost} />
                  <StatItem label="勝率" value={`${stats.winRate}%`} accent="emerald" />
                  <StatItem label="累計スコア" value={stats.totalScore} />
                </div>

                {/* 直近ゲーム履歴 */}
                {stats.recentGames.length > 0 ? (
                  <div>
                    <p className="text-slate-400 text-xs mb-2">直近の対戦</p>
                    <div className="space-y-2">
                      {stats.recentGames.map((game, i) => (
                        <RecentGameRow key={i} game={game} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">
                    ゲームに参加すると戦績が記録されます。
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function StatItem({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: 'emerald'
}) {
  return (
    <div className="bg-slate-700 rounded-lg px-3 py-2">
      <p className="text-slate-400 text-xs">{label}</p>
      <p className={`text-lg font-bold ${accent === 'emerald' ? 'text-emerald-400' : 'text-slate-100'}`}>
        {value}
      </p>
    </div>
  )
}

function RecentGameRow({ game }: { game: RecentGame }) {
  const date = new Date(game.gameRecord.createdAt).toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
  })
  return (
    <div className="flex items-center justify-between bg-slate-700/60 rounded px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span
          className={`font-bold text-xs px-1.5 py-0.5 rounded ${
            game.isWinner ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-slate-300'
          }`}
        >
          {game.isWinner ? '勝' : '負'}
        </span>
        <span className="text-slate-300">
          {game.rank}位 / {game.gameRecord.playerCount}人
        </span>
        {game.declared && (
          <span className="text-amber-400 text-xs">ウニャモ</span>
        )}
      </div>
      <div className="flex items-center gap-3 text-slate-400 text-xs">
        <span>{game.finalScore}点</span>
        <span>{date}</span>
      </div>
    </div>
  )
}
