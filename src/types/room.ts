export interface RoomConfig {
  maxPlayers: number // 2-8
  roomName: string
  isPrivate: boolean
  passwordHash?: string
}
