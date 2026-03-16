import { type NextRequest, NextResponse } from 'next/server'

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export function GET(req: NextRequest): NextResponse {
  const at = req.nextUrl.searchParams.get('at')
  const rt = req.nextUrl.searchParams.get('rt')

  if (!at || !rt) {
    return NextResponse.redirect(new URL('/login?error=oauth_failed', req.url))
  }

  const response = NextResponse.redirect(new URL('/', req.url))

  response.cookies.set('access_token', at, { ...COOKIE_OPTIONS, maxAge: 15 * 60 })
  response.cookies.set('refresh_token', rt, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 })

  return response
}
