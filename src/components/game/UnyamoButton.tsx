'use client'

import { motion } from 'framer-motion'

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
      <div className="px-4 py-2 rounded-full border border-[#e5b649]/40 text-[#f0d89a] text-sm font-heading font-bold opacity-70 bg-[#e5b649]/10">
        ウニャモ宣言済
      </div>
    )
  }

  if (!canDeclare) return null

  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      animate={{ scale: [1, 1.04, 1] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.button
        className="h-12 px-6 rounded-full border-2 border-[#e5b649] text-[#f0d89a] font-heading font-bold text-base
          bg-[#e5b649]/10 hover:bg-[#e5b649]/20 shadow-lg shadow-[#e5b649]/20 transition-colors"
        whileTap={{ scale: 0.94 }}
        onClick={onDeclare}
        aria-label="ウニャモ宣言（任意）"
      >
        Unyamo!
      </motion.button>
      <span className="text-[#f0d89a]/60 text-[10px]">任意・通常操作も続行可</span>
    </motion.div>
  )
}
