'use client'

import { motion } from 'framer-motion'

interface UnyamButtonProps {
  canDeclare: boolean
  hasDeclared: boolean
  onDeclare: () => void
}

/**
 * ウニャム宣言ボタン。
 *
 * 仕様（unyam-specification.md 2.4）:
 * - 手札合計点が5点以下のとき宣言「可能」（=任意。自動宣言や強制はしない）
 * - 宣言しないまま通常操作（捨て・引く）を続行することも可能
 *
 * 表示ルール:
 * - canDeclare=true & hasDeclared=false の場合のみボタンを表示する
 * - クリックは完全にプレイヤーの任意。クリックしなければ通常操作で続行できる
 */
export function UnyamButton({ canDeclare, hasDeclared, onDeclare }: UnyamButtonProps) {
  if (hasDeclared) {
    return (
      <div className="px-4 py-2 rounded-full border border-[#e5b649]/40 text-[#f0d89a] text-sm font-heading font-bold opacity-70 bg-[#e5b649]/10">
        ウニャム宣言済
      </div>
    )
  }

  if (!canDeclare) return null

  return (
    <div className="flex flex-col items-center gap-1">
      {/* レイアウト位置を変えない発光パルスで注意喚起（クリック安定性を確保） */}
      <motion.button
        className="h-12 px-6 rounded-full border-2 border-[#e5b649] text-[#f0d89a] font-heading font-bold text-base
          bg-[#e5b649]/10 hover:bg-[#e5b649]/20 transition-colors"
        animate={{
          boxShadow: [
            '0 0 0 0 rgba(229,182,73,0.0)',
            '0 0 16px 4px rgba(229,182,73,0.45)',
            '0 0 0 0 rgba(229,182,73,0.0)',
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        onClick={onDeclare}
        aria-label="ウニャム宣言（任意）"
      >
        Unyam!
      </motion.button>
      <span className="text-[#f0d89a]/60 text-[10px]">任意・通常操作も続行可</span>
    </div>
  )
}
