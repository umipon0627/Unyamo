'use client'

import { Button } from '@/components/ui/button'

interface ActionPanelProps {
  isMyTurn: boolean
  hasActed: boolean
  canDrawDeck: boolean
  canDrawDiscard: boolean
  selectedCount: number
  hasUsedSpecial: boolean
  onDraw: (source: 'deck' | 'discard') => void
  onDiscard: () => void
  onDiscardMultiple: () => void
  disabled?: boolean
}

export function ActionPanel({
  isMyTurn, hasActed, canDrawDeck, canDrawDiscard,
  selectedCount, hasUsedSpecial, onDraw, onDiscard, onDiscardMultiple, disabled = false
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
      {!hasActed && selectedCount === 1 && (
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={onDiscard}
          disabled={disabled}
        >
          1枚捨てる
        </Button>
      )}
      {!hasActed && selectedCount >= 2 && !hasUsedSpecial && (
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={onDiscardMultiple}
          disabled={disabled}
        >
          {selectedCount}枚まとめて捨てる
        </Button>
      )}
      {hasActed && canDrawDeck && (
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
      {hasActed && canDrawDiscard && (
        <Button
          size="sm"
          variant="outline"
          className="border-emerald-700 text-emerald-400"
          onClick={() => onDraw('discard')}
          disabled={disabled}
        >
          捨て札から引く
        </Button>
      )}
    </div>
  )
}
