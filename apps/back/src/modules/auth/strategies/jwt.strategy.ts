import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { Request } from 'express'
import { ConfigService } from '@nestjs/config'
import { JwtPayload } from '../../../common/decorators/current-user.decorator'
import type { Env } from '../../../config/env.validation'

function extractJwtFromCookie(req: Request): string | null {
  const token: unknown = req.cookies?.access_token
  if (typeof token === 'string' && token.length > 0) {
    return token
  }
  return null
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService<Env, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractJwtFromCookie]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET', { infer: true }),
    })
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload
  }
}
