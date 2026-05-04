'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface UnyamoButtonProps {
  canDeclare: boolean
  hasDeclared: boolean
  onDeclare: () => void
}

/**
 * ウニャモ宣言ボタン。
 *
 * 仕様（unyamo-specification.md 2.4）:
 * - 手札合計点が5点以下のとき宣言「可能」（=任意。自動宣言や強制はしない）
 * - 宣言しないまま通常操作（捨て・引く）を続行することも可能
 *
 * 表示ルール:
 * - canDeclare=true & hasDeclared=false の場合のみボタンを表示する
 * - クリックは完全にプレイヤーの任意。クリックしなければ通常操作で続行できる
 */
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
      className="flex flex-col items-center gap-1"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Button
        className="h-14 px-6 bg-amber-500 hover:bg-amber-400 text-white font-bold text-lg shadow-lg shadow-amber-900/50"
        onClick={onDeclare}
        aria-label="ウニャモ宣言（任意）"
      >
        ウニャモ宣言！
      </Button>
      <span className="text-amber-300/80 text-[10px]">任意・通常操作も続行可</span>
    </motion.div>
  )
}
