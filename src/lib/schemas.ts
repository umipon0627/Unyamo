import { z } from 'zod'

export const createRoomSchema = z.object({
  roomName: z.string().min(1).max(30).trim(),
  maxPlayers: z.number().int().min(3).max(8),
  isPrivate: z.boolean(),
  password: z.string().min(4).max(20).optional(),
})

export const joinRoomSchema = z.object({
  password: z.string().optional(),
})

export type CreateRoomInput = z.infer<typeof createRoomSchema>
