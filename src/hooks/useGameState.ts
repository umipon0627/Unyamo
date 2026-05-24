'use client'

import { useReducer, useCallback } from 'react'
import type { ServerMessage, ClientGameStatePayload } from '../../party/messages'
import type { Card } from '@/types/card'

interface LocalGameState {
  gameState: ClientGameStatePayload | null
  results: { results: { playerId: string; playerName: string; hand: Card[]; totalScore: number; rank: number; declared: boolean; isWinner: boolean }[] } | null
  unyamDeclarerId: string | null
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
    case 'GAME_STATE': {
      // WAITING に戻った（再戦リセット）場合、結果と宣言者をクリア
      const isReset = action.payload.phase === 'WAITING' && state.phase !== 'WAITING'
      return {
        ...state,
        gameState: action.payload,
        currentPlayerId: action.payload.currentTurnPlayerId,
        phase: action.payload.phase,
        ...(isReset ? { results: null, unyamDeclarerId: null } : {}),
      }
    }
    case 'UNYAMO_DECLARED':
      return { ...state, unyamDeclarerId: action.payload.playerId }
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
  unyamDeclarerId: null,
  currentPlayerId: null,
  phase: 'WAITING',
}

export function useGameState(myPlayerId: string) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // WebSocket から届いた全メッセージをここで処理する。
  // useReducer の dispatch は React がレンダーをバッチしても
  // 1件ずつ順に reducer を適用するため、GAME_RESULT の直後に
  // GAME_STATE が来てもどちらも確実に反映される（取りこぼし防止）。
  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'GAME_STATE':
        dispatch({ type: 'GAME_STATE', payload: msg.payload })
        break
      case 'UNYAMO_DECLARED':
        dispatch({ type: 'UNYAMO_DECLARED', payload: msg.payload })
        break
      case 'GAME_RESULT':
        dispatch({ type: 'GAME_RESULT', payload: msg.payload })
        break
    }
  }, [])

  const isMyTurn = state.currentPlayerId === myPlayerId

  return {
    gameState: state.gameState,
    myHand: state.gameState?.myHand ?? [],
    discardTop: state.gameState?.discardPileTop ?? null,
    currentPlayerId: state.currentPlayerId,
    phase: state.phase,
    isMyTurn,
    results: state.results,
    unyamDeclarerId: state.unyamDeclarerId,
    availableActions: state.gameState?.availableActions ?? [],
    // 待機画面用フィールド
    hostId: state.gameState?.hostId ?? '',
    maxPlayers: state.gameState?.maxPlayers ?? 4,
    roomName: state.gameState?.roomName ?? '',
    players: state.gameState?.players ?? [],
    canStartGame: state.gameState?.canStartGame ?? false,
    handleMessage,
  }
}
