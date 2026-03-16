import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import { Role } from '@prisma/client'
import { REQUIRE_SUBSCRIPTION_KEY } from '../decorators/require-subscription.decorator'
import { JwtPayload } from '../decorators/current-user.decorator'

function isJwtPayload(value: unknown): value is JwtPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).sub === 'string' &&
    typeof (value as Record<string, unknown>).subscription === 'string'
  )
}

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireSubscription = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    )
    if (!requireSubscription) {
      return true
    }

    const request = context.switchToHttp().getRequest<Request>()
    const user = (request as Request & { user?: unknown }).user

    if (!isJwtPayload(user)) {
      throw new ForbiddenException('Access denied')
    }

    if (user.subscription !== Role.PAID && user.subscription !== Role.ADMIN) {
      throw new ForbiddenException('Paid subscription required')
    }

    return true
  }
}
