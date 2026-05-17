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
    <div className="flex flex-col items-center gap-1.5">
      <motion.button
        className={cn(
          'relative w-14 h-20 rounded-[10px] border-2 border-[#1e6b4d]/60',
          'bg-gradient-to-br from-[#2a7d5c] via-[#1e6b4d] to-[#0e2f22]',
          'flex items-center justify-center shadow-lg',
          canDraw
            ? 'cursor-pointer hover:brightness-125 hover:shadow-[#2e9c8a]/30 hover:shadow-xl'
            : 'cursor-not-allowed opacity-50',
        )}
        whileTap={canDraw ? { scale: 0.93 } : undefined}
        whileHover={canDraw ? { scale: 1.04 } : undefined}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        onClick={canDraw ? onDraw : undefined}
        aria-label={`山札 残り${remaining}枚`}
        disabled={!canDraw}
      >
        <span className="text-[#f0d89a]/60 font-bold text-xl select-none">✦</span>
        {remaining > 0 && (
          <span className="absolute -top-2 -right-2 bg-[#2e9c8a] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
            {remaining > 99 ? '99+' : remaining}
          </span>
        )}
      </motion.button>
      <span className="text-[#f2eee6]/70 text-xs font-heading">山札</span>
    </div>
  )
}
