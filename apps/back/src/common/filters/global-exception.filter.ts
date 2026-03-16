import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { DatabaseError } from '../../modules/auth/errors/auth.errors'

interface DomainError {
  _tag: string
}

function isDomainError(value: unknown): value is DomainError {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_tag' in value &&
    typeof (value as Record<string, unknown>)._tag === 'string'
  )
}

const domainErrorToStatus: Record<string, number> = {
  InvalidCredentialsError: HttpStatus.UNAUTHORIZED,
  UserNotFoundError: HttpStatus.NOT_FOUND,
  EmailAlreadyExistsError: HttpStatus.CONFLICT,
  DatabaseError: HttpStatus.INTERNAL_SERVER_ERROR,
  TokenExpiredError: HttpStatus.UNAUTHORIZED,
  EmailNotVerifiedError: HttpStatus.FORBIDDEN,
  InvalidTokenError: HttpStatus.BAD_REQUEST,
}

const domainErrorToMessage: Record<string, string> = {
  InvalidCredentialsError: 'Invalid credentials',
  UserNotFoundError: 'User not found',
  EmailAlreadyExistsError: 'Email already exists',
  DatabaseError: 'Internal server error',
  TokenExpiredError: 'Token expired',
  EmailNotVerifiedError: 'Email not verified',
  InvalidTokenError: 'Invalid token',
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const exceptionResponse = exception.getResponse()
      response.status(status).json({
        data: null,
        meta: {
          statusCode: status,
          message:
            typeof exceptionResponse === 'string'
              ? exceptionResponse
              : ((exceptionResponse as Record<string, unknown>).message ?? exception.message),
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      })
      return
    }

    if (isDomainError(exception)) {
      const status = domainErrorToStatus[exception._tag] ?? HttpStatus.INTERNAL_SERVER_ERROR
      const message = domainErrorToMessage[exception._tag] ?? 'Internal server error'
      if (status >= (HttpStatus.INTERNAL_SERVER_ERROR as number)) {
        this.logger.error(
          `Domain error: ${exception._tag}`,
          exception instanceof DatabaseError ? String(exception.errorCause) : undefined,
        )
      }
      response.status(status).json({
        data: null,
        meta: {
          statusCode: status,
          message,
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      })
      return
    }

    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : String(exception),
    )
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      data: null,
      meta: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    })
  }
}
