import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, Profile } from 'passport-github2'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../../config/env.validation'

export interface GithubProfile {
  id: string
  email: string
  name: string
  provider: 'github'
}

type GithubDoneCallback = (error: Error | null, user?: GithubProfile) => void

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(configService: ConfigService<Env, true>) {
    super({
      clientID: configService.get('GITHUB_CLIENT_ID', { infer: true }) ?? '',
      clientSecret: configService.get('GITHUB_CLIENT_SECRET', { infer: true }) ?? '',
      callbackURL: `${configService.get('API_URL', { infer: true })}/auth/github/callback`,
      scope: ['user:email'],
    })
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: GithubDoneCallback,
  ): void {
    const email = profile.emails?.[0]?.value ?? `${profile.username ?? profile.id}@github.invalid`
    const name = profile.displayName ?? profile.username ?? profile.id

    const githubProfile: GithubProfile = {
      id: profile.id,
      email,
      name,
      provider: 'github',
    }

    done(null, githubProfile)
  }
}
