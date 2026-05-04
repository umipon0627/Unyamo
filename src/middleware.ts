import { NextRequest, NextResponse } from 'next/server'
import { GUEST_COOKIE_NAME } from '@/lib/guest-cookie'

const protectedPaths = ['/lobby', '/room', '/result']
const loginRequiredPaths = ['/profile'] // ゲストではアクセス不可

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))
  const isLoginRequired = loginRequiredPaths.some((p) => pathname.startsWith(p))

  if (isProtected || isLoginRequired) {
    const authToken =
      req.cookies.get('authjs.session-token')?.value ??
      req.cookies.get('__Secure-authjs.session-token')?.value
    const guestToken = req.cookies.get(GUEST_COOKIE_NAME)?.value

    // /profile などログイン専用パス
    if (isLoginRequired && !authToken) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // /lobby, /room, /result はゲストでもOK
    if (isProtected && !authToken && !guestToken) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
