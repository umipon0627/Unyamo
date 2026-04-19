'use client'

import { motion } from 'framer-motion'
import { Card } from './Card'
import type { Card as CardType } from '@/types/card'

interface HandProps {
  cards: CardType[]
  selectedIndices?: number[]
  onSelect?: (index: number) => void
  faceDown?: boolean
  size?: 'sm' | 'md' | 'lg'
  isMobile?: boolean
}

export function Hand({ cards, selectedIndices = [], onSelect, faceDown = false, size = 'md', isMobile = false }: HandProps) {
  const totalAngle = isMobile ? 20 : 40
  const spread = isMobile ? 18 : 24

  return (
    <div className="relative flex items-end justify-center" style={{ height: size === 'sm' ? 80 : size === 'lg' ? 140 : 110 }}>
      {cards.map((card, i) => {
        const count = cards.length
        const angle = count <= 1 ? 0 : (i - (count - 1) / 2) * (totalAngle / Math.max(count - 1, 1))
        const xOffset = count <= 1 ? 0 : (i - (count - 1) / 2) * spread
        const isSelected = selectedIndices.includes(i)

        return (
          <motion.div
            key={card.id}
            className="absolute"
            style={{ transformOrigin: 'bottom center', zIndex: i }}
            animate={{
              rotate: angle,
              x: xOffset,
              y: isSelected ? -20 : 0,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <Card
              card={faceDown ? undefined : card}
              faceDown={faceDown}
              size={size}
              selected={isSelected}
              onClick={onSelect ? () => onSelect(i) : undefined}
            />
          </motion.div>
        )
      })}
    </div>
  )
}
