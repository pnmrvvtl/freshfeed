import { type NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const UNAUTHENTICATED_ONLY_PATHS = new Set(['/login', '/register'])

const PROTECTED_PREFIX = '/dashboard'
const PAID_PREFIX = '/settings'

interface JwtPayload {
  sub: string
  email: string
  subscription: 'FREE' | 'PAID' | 'ADMIN'
}

function isJwtPayload(value: unknown): value is JwtPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).sub === 'string' &&
    typeof (value as Record<string, unknown>).subscription === 'string'
  )
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not configured')
  return new TextEncoder().encode(secret)
}

async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    return isJwtPayload(payload) ? payload : null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('access_token')?.value ?? null

  const isProtectedPath = pathname.startsWith(PROTECTED_PREFIX)
  const isPaidPath = pathname.startsWith(PAID_PREFIX)

  const payload = token ? await verifyToken(token) : null
  const isAuthenticated = payload !== null

  if (isAuthenticated && UNAUTHENTICATED_ONLY_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isProtectedPath && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isPaidPath) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (payload.subscription === 'FREE') {
      return NextResponse.redirect(new URL('/upgrade', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
