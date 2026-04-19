import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env['NEXTAUTH_SECRET'] ?? '')

export async function verifyToken(
  token: string
): Promise<{ userId: string; name: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    const userId = payload['id'] as string | undefined
    const name = payload['name'] as string | undefined
    if (!userId || !name) return null
    return { userId, name }
  } catch {
    return null
  }
}
