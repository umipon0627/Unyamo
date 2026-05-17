'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TurnIndicatorProps {
  currentPlayerName: string
  isMyTurn: boolean
  turnNumber?: number
}

export function TurnIndicator({ currentPlayerName, isMyTurn, turnNumber }: TurnIndicatorProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentPlayerName + String(isMyTurn)}
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-heading font-bold',
          isMyTurn
            ? 'bg-[#c8202b] text-white shadow shadow-[#c8202b]/40'
            : 'bg-[#f2eee6]/15 text-[#f2eee6]/80 border border-[#f2eee6]/20',
        )}
      >
        {isMyTurn && (
          <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse" aria-hidden="true" />
        )}
        {isMyTurn ? 'あなたのターン' : `${currentPlayerName} のターン`}
        {turnNumber !== undefined && (
          <span className="text-xs font-normal opacity-70">Turn {turnNumber}</span>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
