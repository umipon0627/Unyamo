export interface RoomConfig {
  maxPlayers: number // 3-8
  roomName: string
  isPrivate: boolean
  passwordHash?: string
}
