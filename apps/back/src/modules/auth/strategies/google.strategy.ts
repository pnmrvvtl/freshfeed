import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../../config/env.validation'

export interface GoogleProfile {
  id: string
  email: string
  name: string
  provider: 'google'
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService<Env, true>) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID', { infer: true }) ?? '',
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET', { infer: true }) ?? '',
      callbackURL: `${configService.get('API_URL', { infer: true })}/auth/google/callback`,
      scope: ['email', 'profile'],
    })
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value
    const name =
      profile.displayName ??
      `${profile.name?.givenName ?? ''} ${profile.name?.familyName ?? ''}`.trim()

    if (!email) {
      done(new Error('No email returned from Google'), undefined)
      return
    }

    const googleProfile: GoogleProfile = {
      id: profile.id,
      email,
      name,
      provider: 'google',
    }

    done(null, googleProfile)
  }
}
