'use client'

import { motion } from 'framer-motion'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ResultEntry {
  playerId: string
  playerName: string
  totalScore: number
  rank: number
  declared: boolean
  isWinner: boolean
}

interface ResultModalProps {
  open: boolean
  results: ResultEntry[]
  myPlayerId: string
  onBackToLobby: () => void
}

function Confetti() {
  const pieces = Array.from({ length: 20 }, (_, i) => i)
  const colors = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6']
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map(i => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            background: colors[i % colors.length],
            left: `${(i * 5 + 5) % 100}%`,
            top: '-10px',
          }}
          animate={{ y: '110vh', rotate: 720, opacity: [1, 1, 0] }}
          transition={{ duration: 2 + (i % 3) * 0.5, delay: i * 0.08, ease: 'linear' }}
        />
      ))}
    </div>
  )
}

export function ResultModal({ open, results, myPlayerId, onBackToLobby }: ResultModalProps) {
  const me = results.find(r => r.playerId === myPlayerId)
  const iWon = me?.isWinner ?? false
  const sorted = [...results].sort((a, b) => a.rank - b.rank)

  return (
    <Dialog open={open}>
      <DialogContent className={cn(
        'relative overflow-hidden border-slate-700 max-w-sm w-full',
        iWon ? 'bg-emerald-950' : 'bg-slate-800',
      )}>
        {iWon && <Confetti />}
        <DialogHeader>
          <DialogTitle className={cn(
            'text-center text-2xl font-bold',
            iWon ? 'text-emerald-400' : 'text-slate-300',
          )}>
            {iWon ? '勝利！' : 'ゲーム終了'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 my-4 relative z-10">
          {sorted.map(r => (
            <div
              key={r.playerId}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg',
                r.playerId === myPlayerId ? 'bg-slate-700 ring-1 ring-emerald-500' : 'bg-slate-700/50',
              )}
            >
              <span className="text-slate-400 text-sm w-6">#{r.rank}</span>
              <span className={cn('flex-1 font-medium', r.isWinner && 'text-emerald-400')}>
                {r.playerName}
                {r.declared && <span className="ml-1 text-amber-400 text-xs">宣言</span>}
              </span>
              <span className="text-slate-300 text-sm">{r.totalScore}点</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 relative z-10">
          <Button
            variant="outline"
            className="flex-1 border-slate-600"
            onClick={onBackToLobby}
          >
            ロビーへ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
