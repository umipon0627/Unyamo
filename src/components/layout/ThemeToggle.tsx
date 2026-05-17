'use client'

// ThemeToggle: ライト/ダーク切替。
// SSR hydration不整合・set-state-in-effect lintエラーを避けるため
// stateを使わずrefとDOMのclassList操作で実現する。

import { useRef, useCallback } from 'react'

export default function ThemeToggle() {
  const btnRef = useRef<HTMLButtonElement>(null)

  const toggle = useCallback(() => {
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('unyamo-theme', isDark ? 'dark' : 'light')
    if (btnRef.current) {
      btnRef.current.textContent = isDark ? '☀️' : '🌙'
      btnRef.current.setAttribute('aria-pressed', String(isDark))
      btnRef.current.setAttribute(
        'aria-label',
        isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え',
      )
    }
  }, [])

  // 初期テキストは🌙固定（クライアント描画後にhydrationなし）
  // aria-pressedは初期false（ライト基準）
  return (
    <button
      ref={btnRef}
      onClick={toggle}
      aria-label="テーマを切り替え"
      aria-pressed={false}
      className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-unyamo-border bg-unyamo-surface hover:bg-unyamo-cream transition-colors text-base select-none"
    >
      🌙
    </button>
  )
}
