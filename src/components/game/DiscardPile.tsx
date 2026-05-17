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
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          'w-14 h-20 rounded-[10px] flex items-center justify-center',
          !topCard && 'border-2 border-dashed border-[#f2eee6]/20',
          canPickup && 'ring-2 ring-[#2e9c8a] ring-offset-1 ring-offset-transparent',
        )}
      >
        <AnimatePresence mode="wait">
          {topCard ? (
            <motion.div
              key={topCard.id}
              initial={{ y: -24, opacity: 0, scale: 0.85 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              <Card
                card={topCard}
                size="md"
                onClick={canPickup ? onPickup : undefined}
                disabled={!canPickup}
              />
            </motion.div>
          ) : (
            <motion.span
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[#f2eee6]/30 text-xs text-center leading-snug"
            >
              捨て札<br />なし
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <span className="text-[#f2eee6]/70 text-xs font-heading">捨て札</span>
    </div>
  )
}
