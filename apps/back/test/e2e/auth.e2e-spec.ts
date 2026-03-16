import { Test } from '@nestjs/testing'
import type { TestingModule } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { ValidationPipe } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { ConfigModule } from '@nestjs/config'
import { PassportModule } from '@nestjs/passport'
import { getQueueToken } from '@nestjs/bullmq'
import * as cookieParser from 'cookie-parser'
import * as request from 'supertest'
import * as bcrypt from 'bcrypt'
import { mockDeep } from 'jest-mock-extended'
import type { DeepMockProxy } from 'jest-mock-extended'
import { Role } from '@prisma/client'
import { PrismaService } from '../../src/database/prisma.service'
import { AuthController } from '../../src/modules/auth/auth.controller'
import { AuthService } from '../../src/modules/auth/auth.service'
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy'
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard'
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter'
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor'
import { EMAIL_QUEUE } from '../../src/modules/email/email-queue.types'

jest.mock('bcrypt')
const mockedBcrypt = jest.mocked(bcrypt)

const TEST_ACCESS_SECRET = 'e2e-test-access-secret-32-chars-!!!'
const TEST_REFRESH_SECRET = 'e2e-test-refresh-secret-32-chars-!!'
const ACCESS_EXPIRES_IN = 900
const REFRESH_EXPIRES_IN = 604800

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
    id: 'user-e2e-1',
    email: 'user@example.com',
    name: 'E2E User',
    role: Role.FREE,
    emailVerified: true,
    passwordHash: 'hashed-pw',
    provider: null,
    providerId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

describe('Auth (e2e)', () => {
  let app: INestApplication
  let prisma: DeepMockProxy<PrismaService>
  let jwtService: JwtService
  let emailQueueMock: { add: jest.Mock }

  beforeAll(async () => {
    prisma = mockDeep<PrismaService>()
    emailQueueMock = { add: jest.fn().mockResolvedValue(undefined) }

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              NODE_ENV: 'test',
              PORT: 3099,
              FRONTEND_URL: 'http://localhost:3000',
              DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
              REDIS_URL: 'redis://localhost:6379',
              JWT_ACCESS_SECRET: TEST_ACCESS_SECRET,
              JWT_REFRESH_SECRET: TEST_REFRESH_SECRET,
              JWT_ACCESS_EXPIRES_IN: ACCESS_EXPIRES_IN,
              JWT_REFRESH_EXPIRES_IN: REFRESH_EXPIRES_IN,
            }),
          ],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: TEST_ACCESS_SECRET,
          signOptions: { expiresIn: ACCESS_EXPIRES_IN },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken(EMAIL_QUEUE), useValue: emailQueueMock },
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
        {
          provide: APP_GUARD,
          useFactory: (reflector: Reflector) => new JwtAuthGuard(reflector),
          inject: [Reflector],
        },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    app.use(cookieParser())
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    )

    await app.init()

    jwtService = moduleRef.get(JwtService)
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    prisma.refreshToken.create.mockResolvedValue({
      id: 'rt-e2e-1',
      userId: 'user-e2e-1',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES_IN * 1000),
      createdAt: NOW,
    })
  })

  describe('POST /auth/register', () => {
    it('returns 201 with user data when registration succeeds', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      mockedBcrypt.hash.mockResolvedValue('hashed-pw' as never)
      prisma.user.create.mockResolvedValue(
        makeDbUser({
          id: 'new-user',
          email: 'new@example.com',
          name: 'New User',
          emailVerified: false,
        }),
      )

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'new@example.com', password: 'SecurePass1!', name: 'New User' })
        .expect(201)

      expect(response.body.data.email).toBe('new@example.com')
      expect(response.body.data.emailVerified).toBe(false)
    })

    it('returns 409 when the email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' } as never)

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'existing@example.com', password: 'SecurePass1!', name: 'Existing User' })
        .expect(409)

      expect(response.body.data).toBeNull()
      expect(response.body.meta.statusCode).toBe(409)
    })

    it('returns 400 when request body fails validation', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'short', name: '' })
        .expect(400)
    })
  })

  describe('POST /auth/login', () => {
    it('sets auth cookies and returns user data on successful login', async () => {
      prisma.user.findUnique.mockResolvedValue(makeDbUser())
      mockedBcrypt.compare.mockResolvedValue(true as never)

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'SecurePass1!' })
        .expect(200)

      expect(response.body.data.email).toBe('user@example.com')
      const setCookie = response.headers['set-cookie'] as unknown as string[]
      expect(setCookie.some((c) => c.startsWith('access_token='))).toBe(true)
      expect(setCookie.some((c) => c.startsWith('refresh_token='))).toBe(true)
    })

    it('returns 401 when the password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(makeDbUser())
      mockedBcrypt.compare.mockResolvedValue(false as never)

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'WrongPass1!' })
        .expect(401)

      expect(response.body.meta.statusCode).toBe(401)
    })

    it('returns 401 when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'SecurePass1!' })
        .expect(401)
    })
  })

  describe('POST /auth/logout', () => {
    it('returns 200 and clears cookies when the user is authenticated', async () => {
      const accessToken = jwtService.sign(
        { sub: 'user-e2e-1', email: 'user@example.com', subscription: Role.FREE },
        { secret: TEST_ACCESS_SECRET },
      )
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 })

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', [`access_token=${accessToken}`, 'refresh_token=some-refresh-token'])
        .expect(200)

      const setCookie = response.headers['set-cookie'] as unknown as string[]
      const clearedAccessToken = setCookie.find((c) => c.startsWith('access_token='))
      expect(clearedAccessToken).toBeDefined()
      expect(clearedAccessToken).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i)
    })

    it('returns 401 when no authentication token is provided', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401)
    })
  })

  describe('GET /auth/me', () => {
    it('returns 401 when no access token is provided', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401)
    })

    it('returns the current user profile when a valid token is provided', async () => {
      const accessToken = jwtService.sign(
        { sub: 'user-e2e-1', email: 'user@example.com', subscription: Role.FREE },
        { secret: TEST_ACCESS_SECRET },
      )
      prisma.user.findUnique.mockResolvedValue(makeDbUser())

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', [`access_token=${accessToken}`])
        .expect(200)

      expect(response.body.data.id).toBe('user-e2e-1')
      expect(response.body.data.email).toBe('user@example.com')
    })
  })

  describe('POST /auth/refresh', () => {
    it('returns 200 and issues new cookies when the refresh token is valid', async () => {
      const refreshToken = jwtService.sign(
        { sub: 'user-e2e-1' },
        { secret: TEST_REFRESH_SECRET, expiresIn: REFRESH_EXPIRES_IN },
      )
      prisma.refreshToken.findFirst.mockResolvedValue({ id: 'rt-e2e-1' } as never)
      prisma.user.findUnique.mockResolvedValue(makeDbUser())
      prisma.refreshToken.delete.mockResolvedValue({} as never)

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [`refresh_token=${refreshToken}`])
        .expect(200)

      const setCookie = response.headers['set-cookie'] as unknown as string[]
      expect(setCookie.some((c) => c.startsWith('access_token='))).toBe(true)
      expect(setCookie.some((c) => c.startsWith('refresh_token='))).toBe(true)
    })

    it('returns 401 when no refresh token cookie is present', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').expect(401)
    })
  })
})
