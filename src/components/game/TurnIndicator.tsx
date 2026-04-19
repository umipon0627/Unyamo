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
        key={currentPlayerName}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'px-4 py-2 rounded-full text-sm font-bold text-center',
          isMyTurn
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-700 text-slate-300',
        )}
      >
        {isMyTurn ? 'あなたのターン' : `${currentPlayerName} のターン`}
        {turnNumber !== undefined && (
          <span className="ml-2 text-xs font-normal opacity-70">Turn {turnNumber}</span>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
