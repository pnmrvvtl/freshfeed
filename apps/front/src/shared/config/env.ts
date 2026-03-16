import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

function validateEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  })
  if (!result.success) {
    throw new Error(`Frontend environment validation failed: ${result.error.message}`)
  }
  return result.data
}

export const env = validateEnv()
