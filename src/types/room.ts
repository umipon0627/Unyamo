export interface RoomConfig {
  maxPlayers: number // 2-5
  roomName: string
  isPrivate: boolean
  passwordHash?: string
}
