export class InvalidCredentialsError extends Error {
  readonly _tag = 'InvalidCredentialsError' as const
  constructor() {
    super('Invalid credentials')
  }
}

export class UserNotFoundError extends Error {
  readonly _tag = 'UserNotFoundError' as const
  constructor(readonly identifier: string) {
    super('User not found')
  }
}

export class EmailAlreadyExistsError extends Error {
  readonly _tag = 'EmailAlreadyExistsError' as const
  constructor(readonly email: string) {
    super('Email already exists')
  }
}

export class DatabaseError extends Error {
  readonly _tag = 'DatabaseError' as const
  readonly errorCause: unknown
  constructor(cause: unknown) {
    super('Database error')
    this.errorCause = cause
  }
}

export class TokenExpiredError extends Error {
  readonly _tag = 'TokenExpiredError' as const
  constructor() {
    super('Token expired')
  }
}

export class EmailNotVerifiedError extends Error {
  readonly _tag = 'EmailNotVerifiedError' as const
  constructor() {
    super('Email not verified')
  }
}

export class InvalidTokenError extends Error {
  readonly _tag = 'InvalidTokenError' as const
  constructor() {
    super('Invalid token')
  }
}

export type AuthError =
  | InvalidCredentialsError
  | UserNotFoundError
  | EmailAlreadyExistsError
  | DatabaseError
  | TokenExpiredError
  | EmailNotVerifiedError
  | InvalidTokenError
