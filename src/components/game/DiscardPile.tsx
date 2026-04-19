'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Card } from './Card'
import { cn } from '@/lib/utils'
import type { Card as CardType } from '@/types/card'

interface DiscardPileProps {
  topCard: CardType | null
  onPickup?: () => void
  canPickup?: boolean
}

export function DiscardPile({ topCard, onPickup, canPickup = false }: DiscardPileProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          'w-14 h-20 rounded-lg flex items-center justify-center',
          !topCard && 'border-2 border-dashed border-slate-600',
          canPickup && 'ring-2 ring-emerald-400',
        )}
      >
        <AnimatePresence mode="wait">
          {topCard ? (
            <motion.div
              key={topCard.id}
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                card={topCard}
                size="md"
                onClick={canPickup ? onPickup : undefined}
                disabled={!canPickup}
              />
            </motion.div>
          ) : (
            <motion.span key="empty" className="text-slate-600 text-xs text-center">
              捨て札<br />なし
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <span className="text-slate-400 text-xs">捨て札</span>
    </div>
  )
}
