import { ApiProperty } from '@nestjs/swagger'
import { IsString, MinLength, MaxLength } from 'class-validator'

export class VerifyEmailDto {
  @ApiProperty({ example: 'abc123token...', description: 'Email verification token' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  declare token: string
}
