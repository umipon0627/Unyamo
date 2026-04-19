'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface DeckProps {
  remaining: number
  onDraw?: () => void
  disabled?: boolean
}

export function Deck({ remaining, onDraw, disabled = false }: DeckProps) {
  const canDraw = !disabled && remaining > 0 && onDraw

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.button
        className={cn(
          'relative w-14 h-20 rounded-lg border border-slate-600',
          'bg-gradient-to-br from-emerald-900 to-slate-800',
          'flex items-center justify-center shadow-lg',
          canDraw ? 'cursor-pointer hover:brightness-125 active:scale-95' : 'cursor-not-allowed opacity-50',
        )}
        whileTap={canDraw ? { scale: 0.95 } : undefined}
        onClick={canDraw ? onDraw : undefined}
        aria-label={`山札 残り${remaining}枚`}
        disabled={!canDraw}
      >
        <span className="text-emerald-700 font-bold text-xl select-none">✦</span>
        {remaining > 0 && (
          <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {remaining > 99 ? '99+' : remaining}
          </span>
        )}
      </motion.button>
      <span className="text-slate-400 text-xs">山札</span>
    </div>
  )
}
