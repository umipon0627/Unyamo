'use client'

import { useState, useCallback } from 'react'

export function useAnimation() {
  const [isAnimating, setIsAnimating] = useState(false)
  const [showUnyamoFlash, setShowUnyamoFlash] = useState(false)

  const triggerDraw = useCallback((_cardId: string) => {
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)
  }, [])

  const triggerPlay = useCallback((_cardId: string) => {
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 200)
  }, [])

  const triggerUnyamoFlash = useCallback(() => {
    setShowUnyamoFlash(true)
    setTimeout(() => setShowUnyamoFlash(false), 600)
  }, [])

  return { isAnimating, showUnyamoFlash, triggerDraw, triggerPlay, triggerUnyamoFlash }
}
