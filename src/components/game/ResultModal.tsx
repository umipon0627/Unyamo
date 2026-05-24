'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Card } from '@/types/card'

interface ResultEntry {
  playerId: string
  playerName: string
  hand: Card[]
  totalScore: number
  rank: number
  declared: boolean
  isWinner: boolean
}

interface ResultModalProps {
  open: boolean
  results: ResultEntry[]
  myPlayerId: string
  isHost: boolean
  onPlayAgain: () => void
  onExit: () => void
}

// 順位バッジ色
const RANK_COLORS: Record<number, string> = {
  1: 'bg-[#e5b649] text-[#281e14]',
  2: 'bg-[#b0b0b0] text-white',
  3: 'bg-[#c8602b] text-white',
}

function getRankBadge(rank: number): string {
  return RANK_COLORS[rank] ?? 'bg-[#e7ddc8] text-[#7a6a52]'
}

function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, i) => i)
  const colors = ['#e5b649', '#2e9c8a', '#c8202b', '#3d5a80', '#34a853', '#f0d89a']
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px]" aria-hidden="true">
      {pieces.map(i => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            background: colors[i % colors.length],
            left: `${(i * 4 + 3) % 100}%`,
            top: '-10px',
          }}
          animate={{ y: '110vh', rotate: 720, opacity: [1, 1, 0] }}
          transition={{ duration: 2 + (i % 3) * 0.5, delay: i * 0.07, ease: 'linear' }}
        />
      ))}
    </div>
  )
}

// アバターカラー（プレイヤー名ベース）
const AVATAR_COLORS = ['bg-[#c8202b]', 'bg-[#2e9c8a]', 'bg-[#3d5a80]', 'bg-[#e5b649]', 'bg-[#34a853]']
function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i)) % AVATAR_COLORS.length
  }
  return AVATAR_COLORS[hash] ?? 'bg-[#2e9c8a]'
}

export function ResultModal({ open, results, myPlayerId, isHost, onPlayAgain, onExit }: ResultModalProps) {
  const winner = results.find(r => r.isWinner)
  const sorted = [...results].sort((a, b) => a.rank - b.rank)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          // 自前のフルスクリーン flex センタリング。
          // shadcn の Dialog（fixed top-1/2 -translate-y-1/2）は iOS PWA で
          // 縦長コンテンツのとき viewport をはみ出して下にずれる事象があったため、
          // ここで `items-center justify-center` + `max-h` + 内側スクロールに統一する。
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-unyam-ink/30 supports-backdrop-filter:backdrop-blur-sm"
          style={{
            paddingTop: 'max(1rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-title"
            className="relative w-full max-w-sm bg-[#fffefa] rounded-[20px] border-2 border-[#e7ddc8] shadow-[0_20px_60px_-12px_rgba(40,30,20,0.28)] flex flex-col max-h-full overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          >
            <Confetti />

            {/* 閉じる(×) */}
            <button
              type="button"
              onClick={onExit}
              aria-label="閉じる"
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center text-[#7a6a52] hover:text-[#281e14] hover:bg-[#f0e9d8] transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </button>

            {/* スクロール領域 */}
            <div className="relative z-10 flex flex-col overflow-y-auto">
              {/* ヘッダ: Winner表示 */}
              <div className="px-5 pt-5 pb-2 text-center flex-shrink-0">
                {winner && (
                  <div className="flex flex-col items-center gap-2 mb-1">
                    <div className={cn(
                      'w-16 h-16 rounded-full border-4 border-[#e5b649] flex items-center justify-center text-2xl font-bold text-white shadow-lg',
                      getAvatarColor(winner.playerName),
                    )}>
                      {winner.playerName[0]?.toUpperCase() ?? '?'}
                    </div>
                    <h2 id="result-title" className="text-xl font-heading font-bold text-[#c99634]">
                      Winner — {winner.playerName}
                    </h2>
                    {winner.declared && (
                      <p className="text-sm text-[#7a6a52]">ウニャム宣言で勝利しました</p>
                    )}
                  </div>
                )}
                {!winner && (
                  <h2 id="result-title" className="text-xl font-heading font-bold text-[#281e14]">
                    ゲーム終了
                  </h2>
                )}
              </div>

              {/* 順位リスト */}
              <div className="px-4 pb-3 space-y-2">
          {sorted.map(r => (
            <div
              key={r.playerId}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-2xl border',
                r.playerId === myPlayerId
                  ? 'bg-[#fbf6ec] border-[#e5b649]/50 ring-1 ring-[#e5b649]/30'
                  : 'bg-[#f8f4ec]/60 border-[#e7ddc8]',
              )}
            >
              {/* 順位バッジ */}
              <span className={cn(
                'w-6 h-6 rounded-full text-xs font-heading font-bold flex items-center justify-center flex-shrink-0',
                getRankBadge(r.rank),
              )}>
                {r.rank}
              </span>
              {/* アバター */}
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0',
                getAvatarColor(r.playerName),
              )}>
                {r.playerName[0]?.toUpperCase() ?? '?'}
              </div>
              {/* 名前+タグ */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className={cn(
                    'font-medium text-sm truncate',
                    r.isWinner ? 'text-[#c99634]' : 'text-[#281e14]',
                  )}>
                    {r.playerName}
                  </span>
                  {r.playerId === myPlayerId && (
                    <span className="text-[9px] bg-[#2e9c8a]/15 text-[#1f7a6c] rounded-full px-1.5 py-0.5 font-heading font-bold">YOU</span>
                  )}
                  {r.declared && (
                    <span className="text-[9px] bg-[#e5b649]/15 text-[#c99634] rounded-full px-1.5 py-0.5 font-heading font-bold">宣言</span>
                  )}
                </div>
                <p className="text-[10px] text-[#7a6a52]">
                  {r.declared ? `ウニャム宣言・手札${r.hand.length}枚` : `残り手札${r.hand.length}枚`}
                </p>
              </div>
              {/* 得点 */}
              <span className={cn(
                'font-heading font-bold text-sm flex-shrink-0',
                r.totalScore > 0 ? 'text-[#c8202b]' : 'text-[#1e6b4d]',
              )}>
                {r.totalScore > 0 ? `+${r.totalScore}` : r.totalScore}点
              </span>
            </div>
          ))}
        </div>

              {/* フッタボタン */}
              <div className="flex gap-2 px-4 pb-5">
                <button
                  className="flex-1 py-3 rounded-full border-2 border-[#e7ddc8] text-[#7a6a52] font-heading font-bold text-sm
                    hover:bg-[#f0e9d8] transition-colors"
                  onClick={onExit}
                >
                  退室
                </button>
                {isHost ? (
                  <motion.button
                    className="flex-1 py-3 rounded-full bg-[#1e6b4d] text-white font-heading font-bold text-sm
                      shadow-lg shadow-[#1e6b4d]/30 hover:bg-[#185a3e] transition-colors"
                    whileTap={{ scale: 0.96 }}
                    onClick={onPlayAgain}
                  >
                    もう一度
                  </motion.button>
                ) : (
                  <span className="flex-1 text-center text-[#7a6a52] text-xs py-3">
                    ホストの再戦待ち...
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
