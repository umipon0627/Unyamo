import { auth } from '@/lib/auth'
import { getGuestFromCookies, isGuestUserId } from '@/lib/guest'

export interface CurrentUser {
  id: string
  name: string
  email?: string | null
  image?: string | null
  isGuest: boolean
}

/**
 * Server Component / Route Handler 共通: NextAuth セッション or ゲスト cookie から
 * 現在のユーザーを取り出す。両方ある場合は NextAuth セッション優先。
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth()
  if (session?.user?.id) {
    return {
      id: session.user.id,
      name: session.user.name ?? 'Unknown',
      email: session.user.email ?? null,
      image: session.user.image ?? null,
      isGuest: false,
    }
  }
  const guest = await getGuestFromCookies()
  if (guest) {
    return {
      id: guest.userId,
      name: guest.name,
      email: null,
      image: null,
      isGuest: true,
    }
  }
  return null
}

export { isGuestUserId }
