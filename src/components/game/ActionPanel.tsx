'use client'

import { Button } from '@/components/ui/button'
import type { Card } from '@/types/card'

interface ActionPanelProps {
  isMyTurn: boolean
  /** すでにDRAWフェーズを終えてDISCARDフェーズに入っているか */
  hasDrawn: boolean
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

export function ActionPanel({
  isMyTurn, hasDrawn, canDrawDeck, canDrawDiscard,
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
      {/* DRAW_PHASE: 山札から引く / 捨て札から拾う */}
      {!hasDrawn && canDrawDeck && (
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
      {!hasDrawn && canDrawDiscard && (
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
      {!hasDrawn && !canDrawDeck && !canDrawDiscard && (
        <span className="text-slate-500 text-sm py-1">
          {discardTop
            ? '捨て札は直前のプレイヤーのものではないため引けません'
            : '引けるカードがありません'}
        </span>
      )}

      {/* DISCARD_PHASE: 1枚捨てる / まとめて捨てる */}
      {hasDrawn && selectedCount === 1 && (
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={onDiscard}
          disabled={disabled}
        >
          1枚捨てる
        </Button>
      )}
      {hasDrawn && selectedCount >= 2 && !hasUsedSpecial && (
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={onDiscardMultiple}
          disabled={disabled}
        >
          {selectedCount}枚まとめて捨てる
        </Button>
      )}
      {hasDrawn && selectedCount === 0 && (
        <span className="text-slate-500 text-sm py-1">捨てるカードを選んでください</span>
      )}
    </div>
  )
}
