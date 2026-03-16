import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  Header,
} from '@nestjs/common'
import { Response, Request } from 'express'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'
import { AuthService } from './auth.service'
import { TokenExpiredError } from './errors/auth.errors'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { ResendVerificationDto } from './dto/resend-verification.dto'
import { AuthResponseDto, UserResponseDto, EmptyResponseDto } from './dto/auth-response.dto'
import type { GoogleProfile } from './strategies/google.strategy'
import type { GithubProfile } from './strategies/github.strategy'
import { ConfigService } from '@nestjs/config'
import { SkipThrottle } from '@nestjs/throttler'
import type { Env } from '../../config/env.validation'

const ACCESS_TOKEN_COOKIE = 'access_token'
const REFRESH_TOKEN_COOKIE = 'refresh_token'
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

function isOAuthProfile(value: unknown): value is GoogleProfile | GithubProfile {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).id === 'string' &&
    typeof (value as Record<string, unknown>).email === 'string' &&
    typeof (value as Record<string, unknown>).provider === 'string'
  )
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User registered', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() dto: RegisterDto): Promise<UserResponseDto> {
    return this.authService.register(dto)
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful, tokens set in cookies',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Email not verified' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const { user, tokens } = await this.authService.login(dto)
    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    })
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    return user
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logout successful', type: EmptyResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<null> {
    const refreshToken: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE]
    if (typeof refreshToken === 'string') {
      await this.authService.logout(user.sub, refreshToken)
    }
    res.clearCookie(ACCESS_TOKEN_COOKIE, COOKIE_OPTIONS)
    res.clearCookie(REFRESH_TOKEN_COOKIE, COOKIE_OPTIONS)
    return null
  }

  @Post('refresh')
  @Public()
  @SkipThrottle({ auth: true })
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed', type: EmptyResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<null> {
    const refreshToken: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE]
    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
      throw new TokenExpiredError()
    }
    const tokens = await this.authService.refresh(refreshToken)
    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    })
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    return null
  }

  @Get('me')
  @SkipThrottle({ auth: true })
  @Header('Cache-Control', 'no-store')
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: JwtPayload): Promise<UserResponseDto> {
    return this.authService.getMe(user.sub)
  }

  @Get('google')
  @Public()
  @SkipThrottle({ auth: true })
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth2 login' })
  @ApiResponse({ status: 302, description: 'Redirect to Google OAuth2' })
  googleAuth(): void {
    return
  }

  @Get('google/callback')
  @Public()
  @SkipThrottle({ auth: true })
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth2 callback' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend' })
  async googleAuthCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL', { infer: true })
    const profile = (req as Request & { user?: unknown }).user
    if (!isOAuthProfile(profile)) {
      res.redirect(`${frontendUrl}/login?error=oauth_failed`)
      return
    }
    const { tokens } = await this.authService.handleOAuthUser(profile)
    const params = new URLSearchParams({ at: tokens.accessToken, rt: tokens.refreshToken })
    res.redirect(`${frontendUrl}/api/auth/callback?${params.toString()}`)
  }

  @Get('github')
  @Public()
  @SkipThrottle({ auth: true })
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Initiate GitHub OAuth2 login' })
  @ApiResponse({ status: 302, description: 'Redirect to GitHub OAuth2' })
  githubAuth(): void {
    return
  }

  @Get('github/callback')
  @Public()
  @SkipThrottle({ auth: true })
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth2 callback' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend' })
  async githubAuthCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL', { infer: true })
    const profile = (req as Request & { user?: unknown }).user
    if (!isOAuthProfile(profile)) {
      res.redirect(`${frontendUrl}/login?error=oauth_failed`)
      return
    }
    const { tokens } = await this.authService.handleOAuthUser(profile)
    const params = new URLSearchParams({ at: tokens.accessToken, rt: tokens.refreshToken })
    res.redirect(`${frontendUrl}/api/auth/callback?${params.toString()}`)
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using token' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({ status: 200, description: 'Email verified', type: EmptyResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid token' })
  @ApiResponse({ status: 410, description: 'Token expired' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<null> {
    await this.authService.verifyEmail(dto.token)
    return null
  }

  @Post('resend-verification')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({ status: 200, description: 'Verification email sent', type: EmptyResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<null> {
    await this.authService.resendVerification(dto.email)
    return null
  }
}
