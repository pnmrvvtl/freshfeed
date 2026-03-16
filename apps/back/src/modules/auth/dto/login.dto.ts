import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator'

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  declare email: string

  @ApiProperty({ example: 'SecurePass123!', description: 'User password' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  declare password: string
}
