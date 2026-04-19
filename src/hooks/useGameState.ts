'use client'

import { useReducer, useEffect } from 'react'
import type { ServerMessage, ClientGameStatePayload } from '../../party/messages'
import type { Card } from '@/types/card'

interface LocalGameState {
  gameState: ClientGameStatePayload | null
  results: { results: { playerId: string; playerName: string; hand: Card[]; totalScore: number; rank: number; declared: boolean; isWinner: boolean }[] } | null
  unyamoDeclarerId: string | null
  currentPlayerId: string | null
  phase: string
}

type Action =
  | { type: 'GAME_STATE'; payload: ClientGameStatePayload }
  | { type: 'UNYAMO_DECLARED'; payload: { playerId: string } }
  | { type: 'GAME_RESULT'; payload: { results: { playerId: string; playerName: string; hand: Card[]; totalScore: number; rank: number; declared: boolean; isWinner: boolean }[] } }
  | { type: 'RESET' }

function reducer(state: LocalGameState, action: Action): LocalGameState {
  switch (action.type) {
    case 'GAME_STATE':
      return {
        ...state,
        gameState: action.payload,
        currentPlayerId: action.payload.currentTurnPlayerId,
        phase: action.payload.phase,
      }
    case 'UNYAMO_DECLARED':
      return { ...state, unyamoDeclarerId: action.payload.playerId }
    case 'GAME_RESULT':
      return { ...state, results: action.payload, phase: 'RESULT' }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

const initialState: LocalGameState = {
  gameState: null,
  results: null,
  unyamoDeclarerId: null,
  currentPlayerId: null,
  phase: 'WAITING',
}

export function useGameState(lastMessage: ServerMessage | null, myPlayerId: string) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    if (!lastMessage) return
    switch (lastMessage.type) {
      case 'GAME_STATE':
        dispatch({ type: 'GAME_STATE', payload: lastMessage.payload })
        break
      case 'UNYAMO_DECLARED':
        dispatch({ type: 'UNYAMO_DECLARED', payload: lastMessage.payload })
        break
      case 'GAME_RESULT':
        dispatch({ type: 'GAME_RESULT', payload: lastMessage.payload })
        break
    }
  }, [lastMessage])

  const isMyTurn = state.currentPlayerId === myPlayerId

  return {
    gameState: state.gameState,
    myHand: state.gameState?.myHand ?? [],
    discardTop: state.gameState?.discardPileTop ?? null,
    currentPlayerId: state.currentPlayerId,
    phase: state.phase,
    isMyTurn,
    results: state.results,
    unyamoDeclarerId: state.unyamoDeclarerId,
    availableActions: state.gameState?.availableActions ?? [],
  }
}
