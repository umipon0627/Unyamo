import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return new NextResponse('Unauthorized', { status: 401 })
  return NextResponse.json({ token: token.sub })
}
