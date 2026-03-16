import { ApiProperty } from '@nestjs/swagger'
import { Role } from '@prisma/client'

export class UserResponseDto {
  @ApiProperty({ example: 'cuid123', description: 'User ID' })
  declare id: string

  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  declare email: string

  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  declare name: string

  @ApiProperty({ enum: Role, example: Role.FREE, description: 'User role' })
  declare role: Role

  @ApiProperty({ example: true, description: 'Whether email is verified' })
  declare emailVerified: boolean

  @ApiProperty({ example: '2026-03-08T10:30:00Z', description: 'Created at ISO string' })
  declare createdAt: string

  @ApiProperty({ example: '2026-03-08T10:30:00Z', description: 'Updated at ISO string' })
  declare updatedAt: string
}

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto, description: 'Authenticated user data' })
  declare data: UserResponseDto

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: {},
    description: 'Response metadata',
  })
  declare meta: Record<string, never>
}

export class EmptyResponseDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    example: null,
    description: 'Empty response data',
  })
  declare data: Record<string, never> | null

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: {},
    description: 'Response metadata',
  })
  declare meta: Record<string, never>
}
