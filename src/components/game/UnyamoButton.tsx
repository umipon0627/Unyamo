'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface UnyamoButtonProps {
  canDeclare: boolean
  hasDeclared: boolean
  onDeclare: () => void
}

export function UnyamoButton({ canDeclare, hasDeclared, onDeclare }: UnyamoButtonProps) {
  if (hasDeclared) {
    return (
      <div className="px-4 py-2 bg-amber-900 text-amber-300 rounded-lg text-sm font-bold opacity-60">
        ウニャモ宣言済
      </div>
    )
  }

  if (!canDeclare) return null

  return (
    <motion.div
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Button
        className="h-14 px-6 bg-amber-500 hover:bg-amber-400 text-white font-bold text-lg shadow-lg shadow-amber-900/50"
        onClick={onDeclare}
      >
        ウニャモ宣言！
      </Button>
    </motion.div>
  )
}
