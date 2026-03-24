import { test, expect } from '@playwright/test'
import { createHmac } from 'crypto'

function signVerificationToken(userId: string, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, type: 'email-verification', iat: now, exp: now + 86400 }),
  ).toString('base64url')
  const data = `${header}.${payload}`
  const signature = createHmac('sha256', secret).update(data).digest('base64url')
  return `${data}.${signature}`
}

const JWT_SECRET = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-at-least-32-chars-long'

test.describe('Auth — email/password', () => {
  test('register form submits and redirects to verify-email page', async ({ page }) => {
    const email = `reg-${Date.now()}@e2e.dev`

    await page.goto('/register')
    await page.getByLabel('Full name').fill('E2E User')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('E2ePass1!')
    await page.getByLabel('Confirm password').fill('E2ePass1!')
    await page.getByRole('button', { name: 'Create account' }).click()

    await page.waitForURL('/verify-email')
    await expect(page.getByText('Verifying your email...')).toBeVisible()
  })

  test('full flow: verify email → login → dashboard → home page account info', async ({
    page,
    request,
  }) => {
    const email = `flow-${Date.now()}@e2e.dev`
    const password = 'FlowPass1!'

    const registerRes = await request.post('http://localhost:3001/auth/register', {
      data: { email, password, name: 'Flow User' },
    })
    expect(registerRes.ok()).toBeTruthy()
    const registerBody = (await registerRes.json()) as { data: { id: string } }
    const userId = registerBody.data.id

    const token = signVerificationToken(userId, JWT_SECRET)
    await page.goto(`/verify-email?token=${token}`)

    await expect(page.getByText('Email verified successfully!')).toBeVisible()
    await page.getByRole('button', { name: 'Go to login' }).click()

    await page.waitForURL('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await page.waitForURL('/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText('Your terms will appear here.')).toBeVisible()

    await page.goto('/')
    const accountCard = page.locator('main')
    await expect(accountCard.getByRole('heading', { name: 'Account' })).toBeVisible()
    await expect(accountCard.getByText('Flow User')).toBeVisible()
    await expect(accountCard.locator('dd').filter({ hasText: email })).toBeVisible()
    await expect(accountCard.getByText('FREE')).toBeVisible()
    await expect(accountCard.getByText('Verified', { exact: true })).toBeVisible()
  })

  test('login before email verification shows error message', async ({ page }) => {
    const email = `unverified-${Date.now()}@e2e.dev`
    const password = 'UnverPass1!'

    await page.goto('/register')
    await page.getByLabel('Full name').fill('Unverified User')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByLabel('Confirm password').fill(password)
    await page.getByRole('button', { name: 'Create account' }).click()

    await page.waitForURL('/verify-email')

    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText('Please verify your email before signing in.')).toBeVisible()
  })
})
