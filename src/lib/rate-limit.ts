// インメモリレート制限（Vercel Edge非対応環境向けの簡易版）
const ipRequests = new Map<string, { count: number; resetAt: number }>()
const userRequests = new Map<string, { count: number; resetAt: number }>()

function check(map: Map<string, { count: number; resetAt: number }>, key: string, limit: number): boolean {
  const now = Date.now()
  const entry = map.get(key)
  if (!entry || entry.resetAt < now) {
    map.set(key, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

export function checkRateLimit(ip: string, userId?: string): { allowed: boolean; reason?: string } {
  if (!check(ipRequests, ip, 60)) return { allowed: false, reason: 'IP rate limit exceeded' }
  if (userId && !check(userRequests, userId, 120)) return { allowed: false, reason: 'User rate limit exceeded' }
  return { allowed: true }
}

// ルーム作成: 1ユーザー5ルーム/時間
const roomCreationMap = new Map<string, { count: number; resetAt: number }>()
export function checkRoomCreationLimit(userId: string): boolean {
  return check(roomCreationMap, userId, 5)
}
