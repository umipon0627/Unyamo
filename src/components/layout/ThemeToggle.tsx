'use client'

// ThemeToggle: ライト/ダーク切替。
// SSR hydration不整合・set-state-in-effect lintエラーを避けるため
// stateを使わずrefとDOMのclassList操作で実現する。

import { useRef, useCallback, useEffect } from 'react'

function syncButton(btn: HTMLButtonElement | null, isDark: boolean) {
  if (!btn) return
  btn.textContent = isDark ? '☀️' : '🌙'
  btn.setAttribute('aria-pressed', String(isDark))
  btn.setAttribute(
    'aria-label',
    isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え',
  )
}

export default function ThemeToggle() {
  const btnRef = useRef<HTMLButtonElement>(null)

  // マウント時、レイアウトの復元スクリプトが付与した実DOM状態にボタン表示を同期
  // (setStateではなくref経由のDOM更新なのでhydration不整合/lintを回避)
  useEffect(() => {
    syncButton(btnRef.current, document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = useCallback(() => {
    const isDark = document.documentElement.classList.toggle('dark')
    try {
      localStorage.setItem('unyam-theme', isDark ? 'dark' : 'light')
    } catch {
      /* localStorage 利用不可環境は無視 */
    }
    syncButton(btnRef.current, isDark)
  }, [])

  // 初期テキストは🌙固定（クライアント描画後にhydrationなし）
  // aria-pressedは初期false（ライト基準）
  return (
    <button
      ref={btnRef}
      onClick={toggle}
      aria-label="テーマを切り替え"
      aria-pressed={false}
      className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-unyam-border bg-unyam-surface hover:bg-unyam-cream transition-colors text-base select-none"
    >
      🌙
    </button>
  )
}
