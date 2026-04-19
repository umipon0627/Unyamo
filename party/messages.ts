import { z } from 'zod'
import type { Card } from '../src/types/card'

// クライアント → サーバー
export const joinSchema = z.object({ type: z.literal('JOIN'), payload: z.object({ token: z.string() }) })
export const startGameSchema = z.object({ type: z.literal('START_GAME') })
export const discardSchema = z.object({ type: z.literal('DISCARD'), payload: z.object({ cardId: z.string() }) })
export const discardMultipleSchema = z.object({
  type: z.literal('DISCARD_MULTIPLE'),
  payload: z.object({ cardIds: z.array(z.string()).min(2).max(3) })
})
export const drawSchema = z.object({
  type: z.literal('DRAW'),
  payload: z.object({ source: z.enum(['deck', 'discard']) })
})
export const declareUnyamoSchema = z.object({ type: z.literal('DECLARE_UNYAMO') })
export const reconnectSchema = z.object({ type: z.literal('RECONNECT'), payload: z.object({ token: z.string() }) })

export const clientMessageSchema = z.discriminatedUnion('type', [
  joinSchema, startGameSchema, discardSchema, discardMultipleSchema,
  drawSchema, declareUnyamoSchema, reconnectSchema,
])

export type ClientMessage = z.infer<typeof clientMessageSchema>

// サーバー → クライアント
export interface OtherPlayerView {
  id: string
  name: string
  cardCount: number
  isConnected: boolean
}

export interface ClientGameStatePayload {
  phase: string
  myHand: Card[]
  otherPlayers: OtherPlayerView[]
  discardPileTop: Card | null
  deckCount: number
  currentTurnPlayerId: string
  myTotalScore: number
  canDeclareUnyamo: boolean
  availableActions: string[]
}

export type ServerMessage =
  | { type: 'GAME_STATE'; payload: ClientGameStatePayload }
  | { type: 'ACTION_RESULT'; payload: { success: boolean; action: string; playerId: string; error?: string } }
  | { type: 'TURN_CHANGE'; payload: { currentPlayerId: string } }
  | { type: 'UNYAMO_DECLARED'; payload: { playerId: string; playerName: string } }
  | { type: 'GAME_RESULT'; payload: { results: { playerId: string; playerName: string; hand: Card[]; totalScore: number; rank: number; declared: boolean; isWinner: boolean }[] } }
  | { type: 'ERROR'; payload: { message: string; code: string } }
  | { type: 'PLAYER_STATUS'; payload: { playerId: string; isConnected: boolean } }
