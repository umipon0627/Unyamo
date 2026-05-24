'use client'

import { motion } from 'framer-motion'
import type { Card } from '@/types/card'

interface ActionPanelProps {
  isMyTurn: boolean
  /** ACTION_PHASE: 手札を捨てられるか */
  canDiscard: boolean
  /** DRAW_PHASE: 山札 or 捨て札から引けるか */
  isDrawPhase: boolean
  canDrawDeck: boolean
  canDrawDiscard: boolean
  selectedCount: number
  hasUsedSpecial: boolean
  /** 自分の現在の手札枚数（特殊操作後 0 枚にしない判定用） */
  handSize: number
  onDraw: (source: 'deck' | 'discard') => void
  onDiscard: () => void
  onDiscardMultiple: () => void
  disabled?: boolean
  discardTop?: Card | null
}

/**
 * 仕様 2.6節: ターンの流れは ACTION_PHASE（DISCARD or ウニャム宣言）→ DRAW_PHASE → TURN_END。
 * - canDiscard=true: ACTION_PHASE。手札を選んで捨てる（1枚 or 2-3枚）。
 * - isDrawPhase=true: DRAW_PHASE。山札 or 捨て札から1枚引く。
 */
export function ActionPanel({
  isMyTurn, canDiscard, isDrawPhase, canDrawDeck, canDrawDiscard,
  selectedCount, hasUsedSpecial, handSize, onDraw, onDiscard, onDiscardMultiple,
  disabled = false, discardTop,
}: ActionPanelProps) {
  // 特殊操作 (2-3枚捨て) 後に手札 0 枚にならないこと:
  // 残り枚数 = handSize - selectedCount が 1 以上必要。
  const wouldEmptyHand = selectedCount >= handSize
  if (!isMyTurn) {
    return (
      <div className="flex items-center justify-center px-4 py-2 text-[#f2eee6]/40 text-sm">
        相手のターンです
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {/* ACTION_PHASE: 1枚捨てる / まとめて捨てる */}
      {canDiscard && selectedCount === 1 && (
        <motion.button
          className="px-5 py-2.5 rounded-full bg-[#c8202b] text-white font-heading font-bold text-sm
            shadow-lg shadow-[#c8202b]/30 hover:bg-[#a81820] disabled:opacity-50 disabled:cursor-not-allowed"
          whileTap={{ scale: 0.94 }}
          whileHover={{ scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          onClick={onDiscard}
          disabled={disabled}
          aria-label="選択した1枚を捨てる"
        >
          捨てる
        </motion.button>
      )}
      {canDiscard && selectedCount >= 2 && !hasUsedSpecial && (
        <motion.button
          className="px-5 py-2.5 rounded-full bg-[#c8202b] text-white font-heading font-bold text-sm
            shadow-lg shadow-[#c8202b]/30 hover:bg-[#a81820] disabled:opacity-50 disabled:cursor-not-allowed"
          whileTap={!wouldEmptyHand ? { scale: 0.94 } : undefined}
          whileHover={!wouldEmptyHand ? { scale: 1.03 } : undefined}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          onClick={onDiscardMultiple}
          disabled={disabled || wouldEmptyHand}
          aria-label={
            wouldEmptyHand
              ? `${selectedCount}枚捨てると手札が0枚になるため不可`
              : `選択した${selectedCount}枚をまとめて捨てる`
          }
          title={wouldEmptyHand ? '手札が0枚になるため捨てられません' : undefined}
        >
          捨てる（{selectedCount}枚）
        </motion.button>
      )}
      {canDiscard && selectedCount >= 2 && !hasUsedSpecial && wouldEmptyHand && (
        <span className="text-[#e97179] text-xs py-1">
          手札が0枚になるため、1枚は残してください
        </span>
      )}
      {canDiscard && selectedCount === 0 && (
        <span className="text-[#f2eee6]/50 text-sm py-1">捨てるカードを選んでください</span>
      )}

      {/* DRAW_PHASE: 山札から引く */}
      {isDrawPhase && canDrawDeck && (
        <motion.button
          className="px-5 py-2.5 rounded-full bg-[#1f7a6c] text-white font-heading font-bold text-sm
            shadow-lg shadow-[#1f7a6c]/30 hover:bg-[#175e52] disabled:opacity-50 disabled:cursor-not-allowed"
          whileTap={{ scale: 0.94 }}
          whileHover={{ scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          onClick={() => onDraw('deck')}
          disabled={disabled}
          aria-label="山札から1枚引く"
        >
          引く
        </motion.button>
      )}
      {/* DRAW_PHASE: 捨て札から拾う */}
      {isDrawPhase && canDrawDiscard && (
        <motion.button
          className="px-5 py-2.5 rounded-full border-2 border-[#2e9c8a] text-[#2e9c8a] font-heading font-bold text-sm
            bg-[#2e9c8a]/10 hover:bg-[#2e9c8a]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          whileTap={{ scale: 0.94 }}
          whileHover={{ scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          onClick={() => onDraw('discard')}
          disabled={disabled}
          aria-label="捨て札から1枚拾う"
        >
          捨て札から拾う
        </motion.button>
      )}
      {isDrawPhase && !canDrawDeck && !canDrawDiscard && (
        <span className="text-[#f2eee6]/40 text-sm py-1">
          {discardTop
            ? '捨て札は今自分が捨てたばかりのため拾えません'
            : '引けるカードがありません'}
        </span>
      )}
    </div>
  )
}
