import { createParamDecorator } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import type { Role } from '@prisma/client'

export interface JwtPayload {
  sub: string
  email: string
  subscription: Role
  iat?: number
  exp?: number
}

function isJwtPayload(value: unknown): value is JwtPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).sub === 'string' &&
    typeof (value as Record<string, unknown>).email === 'string'
  )
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<Request>()
    const user = (request as Request & { user?: unknown }).user
    if (!isJwtPayload(user)) {
      throw new Error('User not found in request context')
    }
    return user
  },
)
