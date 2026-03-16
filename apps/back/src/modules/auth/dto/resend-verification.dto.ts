import { ApiProperty } from '@nestjs/swagger'
import { IsEmail } from 'class-validator'

export class ResendVerificationDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address to resend verification to',
  })
  @IsEmail()
  declare email: string
}
