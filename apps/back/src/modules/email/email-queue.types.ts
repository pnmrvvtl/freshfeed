export const EMAIL_QUEUE = 'email-queue'

export interface VerifyEmailJobData {
  type: 'verify-email'
  userId: string
  email: string
  name: string
  token: string
}

export interface WelcomeJobData {
  type: 'welcome'
  userId: string
  email: string
  name: string
}

export type EmailJobData = VerifyEmailJobData | WelcomeJobData
