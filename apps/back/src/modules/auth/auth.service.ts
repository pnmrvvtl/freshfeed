import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { PrismaService } from '../../database/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { UserResponseDto } from './dto/auth-response.dto'
import {
  InvalidCredentialsError,
  EmailAlreadyExistsError,
  DatabaseError,
  TokenExpiredError,
  EmailNotVerifiedError,
  InvalidTokenError,
  UserNotFoundError,
} from './errors/auth.errors'
import { EMAIL_QUEUE, EmailJobData } from '../email/email-queue.types'
import { JwtPayload } from '../../common/decorators/current-user.decorator'
import type { Env } from '../../config/env.validation'
import type { GoogleProfile } from './strategies/google.strategy'
import type { GithubProfile } from './strategies/github.strategy'
import { Role } from '@prisma/client'

const BCRYPT_ROUNDS = 12

interface TokenPair {
  accessToken: string
  refreshToken: string
}

interface TokenConfig {
  secret: string
  expiresIn: number
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Env, true>,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue<EmailJobData>,
  ) {}

  async register(dto: RegisterDto): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    })

    if (existing) {
      throw new EmailAlreadyExistsError(dto.email)
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)

    let user: UserResponseDto

    try {
      const created = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.name,
          emailVerified: false,
          role: Role.FREE,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      user = {
        id: created.id,
        email: created.email,
        name: created.name ?? '',
        role: created.role,
        emailVerified: created.emailVerified,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      }
    } catch (cause) {
      throw new DatabaseError(cause)
    }

    const verificationToken = this.jwtService.sign(
      { sub: user.id, type: 'email-verification' },
      {
        secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: '24h',
      },
    )

    await this.emailQueue.add(
      'verify-email',
      {
        type: 'verify-email',
        userId: user.id,
        email: user.email,
        name: user.name,
        token: verificationToken,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    )

    return user
  }

  async login(dto: LoginDto): Promise<{ user: UserResponseDto; tokens: TokenPair }> {
    const dbUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!dbUser?.passwordHash) {
      throw new InvalidCredentialsError()
    }

    const passwordValid = await bcrypt.compare(dto.password, dbUser.passwordHash)
    if (!passwordValid) {
      throw new InvalidCredentialsError()
    }

    if (!dbUser.emailVerified) {
      throw new EmailNotVerifiedError()
    }

    const tokens = await this.issueTokenPair(dbUser.id, dbUser.email, dbUser.role)

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name ?? '',
        role: dbUser.role,
        emailVerified: dbUser.emailVerified,
        createdAt: dbUser.createdAt.toISOString(),
        updatedAt: dbUser.updatedAt.toISOString(),
      },
      tokens,
    }
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken)
    await this.prisma.refreshToken.deleteMany({
      where: { userId, tokenHash },
    })
  }

  async refresh(incomingRefreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload

    try {
      payload = this.jwtService.verify<JwtPayload>(incomingRefreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      })
    } catch {
      throw new TokenExpiredError()
    }

    const tokenHash = this.hashToken(incomingRefreshToken)

    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    })

    if (!stored) {
      throw new TokenExpiredError()
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    })

    if (!user) {
      throw new TokenExpiredError()
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } })

    return this.issueTokenPair(user.id, user.email, user.role)
  }

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      throw new UserNotFoundError(userId)
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? '',
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }
  }

  async handleOAuthUser(
    profile: GoogleProfile | GithubProfile,
  ): Promise<{ user: UserResponseDto; tokens: TokenPair }> {
    let dbUser = await this.prisma.user.findFirst({
      where: { provider: profile.provider, providerId: profile.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!dbUser) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email: profile.email },
        select: { id: true },
      })

      if (existingByEmail) {
        dbUser = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: { provider: profile.provider, providerId: profile.id, emailVerified: true },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      } else {
        dbUser = await this.prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            provider: profile.provider,
            providerId: profile.id,
            emailVerified: true,
            role: Role.FREE,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      }
    }

    const tokens = await this.issueTokenPair(dbUser.id, dbUser.email, dbUser.role)

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name ?? '',
        role: dbUser.role,
        emailVerified: dbUser.emailVerified,
        createdAt: dbUser.createdAt.toISOString(),
        updatedAt: dbUser.updatedAt.toISOString(),
      },
      tokens,
    }
  }

  async verifyEmail(token: string): Promise<void> {
    let payload: { sub: string; type: string }

    try {
      payload = this.jwtService.verify<{ sub: string; type: string }>(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      })
    } catch {
      throw new InvalidTokenError()
    }

    if (payload.type !== 'email-verification') {
      throw new InvalidTokenError()
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, emailVerified: true },
    })

    if (!user) {
      throw new UserNotFoundError(payload.sub)
    }

    if (!user.emailVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      })
    }
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, emailVerified: true },
    })

    if (!user) {
      throw new UserNotFoundError(email)
    }

    const token = this.jwtService.sign(
      { sub: user.id, type: 'email-verification' },
      {
        secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: '24h',
      },
    )

    await this.emailQueue.add(
      'verify-email',
      {
        type: 'verify-email',
        userId: user.id,
        email,
        name: user.name ?? '',
        token,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    )
  }

  private async issueTokenPair(userId: string, email: string, role: Role): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, email, subscription: role }

    const accessConfig: TokenConfig = {
      secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', { infer: true }),
    }

    const refreshConfig: TokenConfig = {
      secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', { infer: true }),
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessConfig.secret,
        expiresIn: accessConfig.expiresIn,
      }),
      this.jwtService.signAsync(
        { sub: userId },
        { secret: refreshConfig.secret, expiresIn: refreshConfig.expiresIn },
      ),
    ])

    const tokenHash = this.hashToken(refreshToken)
    const refreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', { infer: true })
    const expiresAt = new Date(Date.now() + refreshExpiresIn * 1000)

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    })

    return { accessToken, refreshToken }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }
}
