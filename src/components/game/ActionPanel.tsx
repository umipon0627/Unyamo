'use client'

import { Button } from '@/components/ui/button'
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
  onDraw: (source: 'deck' | 'discard') => void
  onDiscard: () => void
  onDiscardMultiple: () => void
  disabled?: boolean
  discardTop?: Card | null
}

/**
 * 仕様 2.6節: ターンの流れは ACTION_PHASE（DISCARD or ウニャモ宣言）→ DRAW_PHASE → TURN_END。
 * - canDiscard=true: ACTION_PHASE。手札を選んで捨てる（1枚 or 2-3枚）。
 * - isDrawPhase=true: DRAW_PHASE。山札 or 捨て札から1枚引く。
 */
export function ActionPanel({
  isMyTurn, canDiscard, isDrawPhase, canDrawDeck, canDrawDiscard,
  selectedCount, hasUsedSpecial, onDraw, onDiscard, onDiscardMultiple,
  disabled = false, discardTop,
}: ActionPanelProps) {
  if (!isMyTurn) {
    return (
      <div className="flex items-center justify-center p-3 text-slate-500 text-sm">
        他のプレイヤーのターンです
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center p-2">
      {/* ACTION_PHASE: 1枚捨てる / まとめて捨てる */}
      {canDiscard && selectedCount === 1 && (
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={onDiscard}
          disabled={disabled}
        >
          1枚捨てる
        </Button>
      )}
      {canDiscard && selectedCount >= 2 && !hasUsedSpecial && (
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={onDiscardMultiple}
          disabled={disabled}
        >
          {selectedCount}枚まとめて捨てる
        </Button>
      )}
      {canDiscard && selectedCount === 0 && (
        <span className="text-slate-500 text-sm py-1">捨てるカードを選んでください</span>
      )}

      {/* DRAW_PHASE: 山札から引く / 捨て札から拾う */}
      {isDrawPhase && canDrawDeck && (
        <Button
          size="sm"
          variant="outline"
          className="border-slate-600"
          onClick={() => onDraw('deck')}
          disabled={disabled}
        >
          山札から引く
        </Button>
      )}
      {isDrawPhase && canDrawDiscard && (
        <Button
          size="sm"
          variant="outline"
          className="border-emerald-700 text-emerald-400"
          onClick={() => onDraw('discard')}
          disabled={disabled}
        >
          捨て札から拾う
        </Button>
      )}
      {isDrawPhase && !canDrawDeck && !canDrawDiscard && (
        <span className="text-slate-500 text-sm py-1">
          {discardTop
            ? '捨て札は今自分が捨てたばかりのため拾えません'
            : '引けるカードがありません'}
        </span>
      )}
    </div>
  )
}
