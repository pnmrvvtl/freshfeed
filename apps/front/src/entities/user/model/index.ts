import type { components } from '@termsync/contracts'
import { z } from 'zod'

export type User = components['schemas']['UserResponseDto']
export type UserRole = User['role']

export const userSchema: z.ZodType<User> = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['FREE', 'PAID', 'ADMIN']),
  emailVerified: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export function isPaidUser(user: User): boolean {
  return user.role === 'PAID' || user.role === 'ADMIN'
}
