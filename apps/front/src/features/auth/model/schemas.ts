import { z } from 'zod'

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Z]/, 'Must contain at least 1 uppercase letter')
  .regex(/[0-9]/, 'Must contain at least 1 number')
  .regex(/[@$!%*?&]/, 'Must contain at least 1 special character (@$!%*?&)')

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255),
    email: z.string().email('Invalid email address'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
})

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
export type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>
export type ResendVerificationFormValues = z.infer<typeof resendVerificationSchema>
