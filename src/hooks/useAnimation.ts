'use client'

import { useState, useCallback } from 'react'

export function useAnimation() {
  const [isAnimating, setIsAnimating] = useState(false)
  const [showUnyamFlash, setShowUnyamFlash] = useState(false)

  const triggerDraw = useCallback((_cardId: string) => {
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)
  }, [])

  const triggerPlay = useCallback((_cardId: string) => {
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 200)
  }, [])

  const triggerUnyamFlash = useCallback(() => {
    setShowUnyamFlash(true)
    setTimeout(() => setShowUnyamFlash(false), 600)
  }, [])

  return { isAnimating, showUnyamFlash, triggerDraw, triggerPlay, triggerUnyamFlash }
}
