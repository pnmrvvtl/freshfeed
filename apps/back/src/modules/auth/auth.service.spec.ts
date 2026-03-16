import { Test } from '@nestjs/testing'
import type { TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { getQueueToken } from '@nestjs/bullmq'
import { mockDeep } from 'jest-mock-extended'
import type { DeepMockProxy } from 'jest-mock-extended'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { Role } from '@prisma/client'
import { AuthService } from './auth.service'
import { PrismaService } from '../../database/prisma.service'
import { EMAIL_QUEUE } from '../email/email-queue.types'
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  EmailNotVerifiedError,
  TokenExpiredError,
  UserNotFoundError,
  InvalidTokenError,
} from './errors/auth.errors'
import type { RegisterDto } from './dto/register.dto'
import type { LoginDto } from './dto/login.dto'

jest.mock('bcrypt')
jest.mock('crypto')

const mockedBcrypt = jest.mocked(bcrypt)
const mockedCrypto = jest.mocked(crypto)

const NOW = new Date('2026-03-08T10:00:00Z')

interface DbUserShape {
  id: string
  email: string
  name: string | null
  role: Role
  emailVerified: boolean
  passwordHash: string | null
  provider: string | null
  providerId: string | null
  createdAt: Date
  updatedAt: Date
}

function makeDbUser(overrides: Partial<DbUserShape> = {}): DbUserShape {
  return {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: Role.FREE,
    emailVerified: true,
    passwordHash: 'hashed-password',
    provider: null,
    providerId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

describe('AuthService', () => {
  let service: AuthService
  let prisma: DeepMockProxy<PrismaService>
  let jwtService: jest.Mocked<JwtService>
  let configService: jest.Mocked<ConfigService>
  let emailQueue: { add: jest.Mock }

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    jwtService = {
      signAsync: jest.fn(),
      sign: jest.fn(),
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>
    emailQueue = { add: jest.fn().mockResolvedValue(undefined) }

    configService.get.mockImplementation((key: string) => {
      const values: Record<string, string | number> = {
        JWT_ACCESS_SECRET: 'test-access-secret-32-chars-minimum!!',
        JWT_REFRESH_SECRET: 'test-refresh-secret-32-chars-minimum!',
        JWT_ACCESS_EXPIRES_IN: 900,
        JWT_REFRESH_EXPIRES_IN: 604800,
        FRONTEND_URL: 'http://localhost:3000',
      }
      return values[key]
    })

    jwtService.signAsync.mockResolvedValue('mocked-token')
    jwtService.sign.mockReturnValue('mocked-token')

    prisma.refreshToken.create.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'hashed-rt',
      expiresAt: new Date(),
      createdAt: NOW,
    })

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: getQueueToken(EMAIL_QUEUE), useValue: emailQueue },
      ],
    }).compile()

    service = moduleRef.get(AuthService)

    mockedCrypto.randomBytes.mockReturnValue(
      Buffer.from('aabbccdd'.repeat(8), 'hex') as unknown as ReturnType<typeof crypto.randomBytes>,
    )
    mockedCrypto.createHash.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('token-hash-hex'),
    } as unknown as ReturnType<typeof crypto.createHash>)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('register', () => {
    const dto: RegisterDto = {
      email: 'new@example.com',
      password: 'SecurePass1!',
      name: 'New User',
    }

    it('creates a user and enqueues a verification email', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never)

      const createdUser = makeDbUser({
        id: 'user-new',
        email: dto.email,
        name: dto.name,
        emailVerified: false,
      })
      prisma.user.create.mockResolvedValue(createdUser)

      const result = await service.register(dto)

      expect(result.email).toBe(dto.email)
      expect(result.emailVerified).toBe(false)
      expect(emailQueue.add).toHaveBeenCalledWith(
        'verify-email',
        expect.objectContaining({ type: 'verify-email', email: dto.email }),
        expect.any(Object),
      )
    })

    it('throws EmailAlreadyExistsError when email is taken', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' } as never)

      await expect(service.register(dto)).rejects.toBeInstanceOf(EmailAlreadyExistsError)
      expect(prisma.user.create).not.toHaveBeenCalled()
    })
  })

  describe('login', () => {
    const dto: LoginDto = { email: 'test@example.com', password: 'SecurePass1!' }

    it('returns user and tokens for valid verified credentials', async () => {
      const dbUser = makeDbUser()
      prisma.user.findUnique.mockResolvedValue(dbUser)
      mockedBcrypt.compare.mockResolvedValue(true as never)

      const result = await service.login(dto)

      expect(result.user.email).toBe(dbUser.email)
      expect(result.tokens.accessToken).toBe('mocked-token')
      expect(result.tokens.refreshToken).toBe('mocked-token')
    })

    it('throws InvalidCredentialsError when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      await expect(service.login(dto)).rejects.toBeInstanceOf(InvalidCredentialsError)
    })

    it('throws InvalidCredentialsError when user has no password hash', async () => {
      prisma.user.findUnique.mockResolvedValue(makeDbUser({ passwordHash: null }))

      await expect(service.login(dto)).rejects.toBeInstanceOf(InvalidCredentialsError)
    })

    it('throws InvalidCredentialsError when password does not match', async () => {
      prisma.user.findUnique.mockResolvedValue(makeDbUser())
      mockedBcrypt.compare.mockResolvedValue(false as never)

      await expect(service.login(dto)).rejects.toBeInstanceOf(InvalidCredentialsError)
    })

    it('throws EmailNotVerifiedError when email is not verified', async () => {
      prisma.user.findUnique.mockResolvedValue(makeDbUser({ emailVerified: false }))
      mockedBcrypt.compare.mockResolvedValue(true as never)

      await expect(service.login(dto)).rejects.toBeInstanceOf(EmailNotVerifiedError)
    })
  })

  describe('logout', () => {
    it('deletes the refresh token record for the user', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 })

      await service.logout('user-1', 'some-refresh-token')

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', tokenHash: expect.any(String) },
      })
    })
  })

  describe('refresh', () => {
    it('issues new token pair when refresh token is valid', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', email: 'test@example.com' })
      prisma.refreshToken.findFirst.mockResolvedValue({ id: 'rt-1' } as never)
      prisma.user.findUnique.mockResolvedValue(makeDbUser())
      prisma.refreshToken.delete.mockResolvedValue({} as never)

      const result = await service.refresh('valid-refresh-token')

      expect(result.accessToken).toBe('mocked-token')
      expect(result.refreshToken).toBe('mocked-token')
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } })
    })

    it('throws TokenExpiredError when jwt.verify throws', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired')
      })

      await expect(service.refresh('expired-token')).rejects.toBeInstanceOf(TokenExpiredError)
    })

    it('throws TokenExpiredError when token is not found in the database', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', email: 'test@example.com' })
      prisma.refreshToken.findFirst.mockResolvedValue(null)

      await expect(service.refresh('unknown-token')).rejects.toBeInstanceOf(TokenExpiredError)
    })

    it('throws TokenExpiredError when the associated user no longer exists', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', email: 'test@example.com' })
      prisma.refreshToken.findFirst.mockResolvedValue({ id: 'rt-1' } as never)
      prisma.user.findUnique.mockResolvedValue(null)

      await expect(service.refresh('orphaned-token')).rejects.toBeInstanceOf(TokenExpiredError)
    })
  })

  describe('getMe', () => {
    it('returns the user matching the given id', async () => {
      prisma.user.findUnique.mockResolvedValue(makeDbUser())

      const result = await service.getMe('user-1')

      expect(result.id).toBe('user-1')
      expect(result.email).toBe('test@example.com')
    })

    it('throws UserNotFoundError when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      await expect(service.getMe('missing-id')).rejects.toBeInstanceOf(UserNotFoundError)
    })
  })

  describe('verifyEmail', () => {
    it('marks the user email as verified when token is valid', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', type: 'email-verification' })
      prisma.user.findUnique.mockResolvedValue(makeDbUser({ emailVerified: false }))
      prisma.user.update.mockResolvedValue(makeDbUser({ emailVerified: true }))

      await service.verifyEmail('valid-jwt-token')

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { emailVerified: true },
      })
    })

    it('skips the update when email is already verified', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', type: 'email-verification' })
      prisma.user.findUnique.mockResolvedValue(makeDbUser({ emailVerified: true }))

      await service.verifyEmail('valid-jwt-token')

      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('throws InvalidTokenError when jwt.verify throws', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature')
      })

      await expect(service.verifyEmail('bad-token')).rejects.toBeInstanceOf(InvalidTokenError)
    })

    it('throws InvalidTokenError when token type is not email-verification', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', type: 'access' })

      await expect(service.verifyEmail('wrong-type-token')).rejects.toBeInstanceOf(
        InvalidTokenError,
      )
    })
  })

  describe('resendVerification', () => {
    it('signs a new token and enqueues a verification email', async () => {
      prisma.user.findUnique.mockResolvedValue(makeDbUser({ emailVerified: false }))

      await service.resendVerification('test@example.com')

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-1', type: 'email-verification' },
        expect.objectContaining({ expiresIn: '24h' }),
      )
      expect(emailQueue.add).toHaveBeenCalledWith(
        'verify-email',
        expect.objectContaining({ type: 'verify-email', email: 'test@example.com' }),
        expect.any(Object),
      )
    })

    it('throws UserNotFoundError when email does not correspond to any user', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      await expect(service.resendVerification('ghost@example.com')).rejects.toBeInstanceOf(
        UserNotFoundError,
      )
    })
  })
})
