import { jwtVerify } from 'jose'

/**
 * PartyKit ではプロジェクトの環境変数は `room.env` 経由でのみアクセス可能で、
 * `process.env` では取得できないため、secret を呼び出し側から注入する。
 * 呼び出し側は `room.env['AUTH_SECRET']` などから取得して渡す。
 */
export async function verifyToken(
  token: string,
  secretRaw: string | undefined
): Promise<{ userId: string; name: string } | null> {
  if (!secretRaw) return null
  try {
    const secret = new TextEncoder().encode(secretRaw)
    const { payload } = await jwtVerify(token, secret)
    const userId = payload['id'] as string | undefined
    const name = payload['name'] as string | undefined
    if (!userId || !name) return null
    return { userId, name }
  } catch {
    return null
  }
}
