import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

  const avatarInitial = user.name[0]?.toUpperCase() ?? 'U'

  return (
    <div className="flex flex-col min-h-screen bg-unyamo-cream">
      <Header />
      <main className="max-w-2xl mx-auto w-full px-4 py-8 space-y-5">
        {/* ページ見出し */}
        <div>
          <h1 className="font-heading text-2xl font-bold text-unyamo-ink">プロフィール</h1>
          <p className="text-sm font-heading text-unyamo-ink-muted mt-0.5">STATS · HISTORY</p>
        </div>

        {/* プロフィールカード */}
        <div className="bg-unyamo-surface border-2 border-unyamo-border rounded-3xl p-6 shadow-[0_6px_20px_-6px_rgba(40,30,20,0.12)]">
          <div className="flex items-center gap-5">
            {/* アバター */}
            <div className="relative flex-shrink-0">
              <Avatar className="h-16 w-16 border-2 border-unyamo-gold ring-2 ring-unyamo-gold-soft">
                {!user.isGuest && user.image && (
                  <AvatarImage src={user.image} />
                )}
                <AvatarFallback className="font-heading font-extrabold text-2xl bg-unyamo-green text-unyamo-cream">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
              {user.isGuest && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-unyamo-gold flex items-center justify-center text-xs">
                  G
                </span>
              )}
            </div>

            {/* ユーザー情報 */}
            <div className="flex-1 min-w-0">
              <p className="font-heading text-xl font-extrabold text-unyamo-ink truncate">
                {user.name}
              </p>
              {user.email && (
                <p className="font-heading text-sm text-unyamo-ink-muted truncate">
                  {user.email}
                </p>
              )}
              {user.isGuest ? (
                <span className="inline-block mt-1.5 px-3 py-0.5 rounded-full bg-unyamo-gold-soft border border-unyamo-gold/40 text-xs font-heading font-bold text-unyamo-gold-deep">
                  ゲストユーザー
                </span>
              ) : stats && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="inline-block px-3 py-0.5 rounded-full bg-unyamo-cream border border-unyamo-border text-xs font-heading font-bold text-unyamo-ink-muted">
                    🏆 {stats.gamesPlayed} GAMES
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 戦績エリア */}
        {user.isGuest ? (
          <div className="bg-unyamo-surface border-2 border-unyamo-border rounded-3xl p-6 shadow-[0_6px_20px_-6px_rgba(40,30,20,0.12)] text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-heading font-bold text-unyamo-ink mb-1">戦績は記録されません</p>
            <p className="text-sm text-unyamo-ink-muted">
              アカウント登録すると戦績が保存されます
            </p>
          </div>
        ) : stats === null ? (
          <div className="bg-unyamo-surface border-2 border-unyamo-border rounded-3xl p-6 shadow-[0_6px_20px_-6px_rgba(40,30,20,0.12)] text-center">
            <p className="text-4xl mb-3">⚠️</p>
            <p className="font-heading font-bold text-unyamo-ink">
              戦績の取得に失敗しました
            </p>
          </div>
        ) : (
          <>
            {/* 3スタットカード */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="WIN"
                value={stats.gamesWon}
                colorClass="bg-unyamo-green text-unyamo-cream"
              />
              <StatCard
                label="LOSE"
                value={stats.gamesLost}
                colorClass="bg-unyamo-red text-white"
              />
              <StatCard
                label="勝率"
                value={`${stats.winRate}%`}
                colorClass="bg-unyamo-gold text-unyamo-ink"
              />
            </div>

            {/* スコア推移カード */}
            <div className="bg-unyamo-surface border-2 border-unyamo-border rounded-3xl p-5 shadow-[0_6px_20px_-6px_rgba(40,30,20,0.12)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-heading font-bold text-unyamo-ink text-sm">スコア推移</p>
                  <p className="text-xs font-heading text-unyamo-ink-muted">LAST 10</p>
                </div>
                <div className="text-right">
                  <p className="font-heading font-bold text-unyamo-ink-muted text-xs">累計スコア</p>
                  <p className="font-heading font-extrabold text-xl text-unyamo-ink">
                    {stats.totalScore}
                  </p>
                </div>
              </div>
              {/* スコアバー（折れ線の代替：直近10試合のスコアバー） */}
              {stats.recentGames.length > 0 ? (
                <div className="flex items-end gap-1 h-16">
                  {[...stats.recentGames].reverse().map((game, i) => {
                    const maxAbs = Math.max(...stats.recentGames.map(g => Math.abs(g.finalScore)), 1)
                    const pct = Math.min(Math.abs(game.finalScore) / maxAbs, 1)
                    const height = Math.max(pct * 56, 6)
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end">
                        <div
                          className={`w-full rounded-t-sm ${game.finalScore >= 0 ? 'bg-unyamo-teal' : 'bg-unyamo-red-soft'}`}
                          style={{ height: `${height}px` }}
                          title={`${game.finalScore >= 0 ? '+' : ''}${game.finalScore}`}
                        />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-unyamo-ink-muted text-center py-4">
                  まだ対戦記録がありません
                </p>
              )}
            </div>

            {/* HISTORYリスト */}
            <div className="bg-unyamo-surface border-2 border-unyamo-border rounded-3xl p-5 shadow-[0_6px_20px_-6px_rgba(40,30,20,0.12)]">
              <p className="font-heading font-bold text-unyamo-ink text-sm mb-4 flex items-center gap-2">
                <span>📜</span> HISTORY
              </p>
              {stats.recentGames.length > 0 ? (
                <div className="space-y-2">
                  {stats.recentGames.map((game, i) => (
                    <HistoryRow key={i} game={game} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-unyamo-ink-muted text-center py-4">
                  ゲームに参加すると戦績が記録されます
                </p>
              )}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

function StatCard({
  label,
  value,
  colorClass,
}: {
  label: string
  value: string | number
  colorClass: string
}) {
  return (
    <div className={`rounded-3xl p-4 shadow-[0_4px_12px_-4px_rgba(40,30,20,0.18)] ${colorClass}`}>
      <p className="font-heading text-xs font-bold opacity-80 mb-1">{label}</p>
      <p className="font-heading text-2xl font-extrabold leading-none">{value}</p>
    </div>
  )
}

const rankMedals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

function HistoryRow({ game }: { game: RecentGame }) {
  const now = new Date()
  const created = new Date(game.gameRecord.createdAt)
  const diffMs = now.getTime() - created.getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  let timeLabel: string
  if (diffHours < 1) timeLabel = 'たった今'
  else if (diffHours < 24) timeLabel = `${diffHours}時間前`
  else timeLabel = `${diffDays}日前`

  const medal = rankMedals[game.rank]
  const isPositive = game.finalScore >= 0

  return (
    <div
      className={`flex items-center justify-between rounded-2xl px-4 py-3 border-2 transition-colors ${
        game.isWinner
          ? 'border-unyamo-gold/50 bg-unyamo-gold-soft/20'
          : 'border-unyamo-border bg-unyamo-cream'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl" aria-label={`${game.rank}位`}>
          {medal ?? `${game.rank}`}
        </span>
        <div>
          <p className="font-heading font-bold text-unyamo-ink text-sm">
            {game.rank}位 / {game.gameRecord.playerCount}人
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-heading text-unyamo-ink-muted">{timeLabel}</span>
            {game.declared && (
              <span className="text-xs font-heading font-bold text-unyamo-gold-deep">
                · ウニャモ
              </span>
            )}
          </div>
        </div>
      </div>
      <span
        className={`font-heading font-extrabold text-lg ${
          isPositive ? 'text-unyamo-green' : 'text-unyamo-red'
        }`}
        aria-label={`${isPositive ? 'プラス' : 'マイナス'}${Math.abs(game.finalScore)}点`}
      >
        {isPositive ? '+' : ''}{game.finalScore}
      </span>
    </div>
  )
}
