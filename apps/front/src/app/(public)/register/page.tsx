import Link from 'next/link'
import type { Metadata } from 'next'
import { RegisterForm } from '@/features/auth/ui/RegisterForm'
import { OAuthButtons } from '@/features/auth/ui/OAuthButtons'
import { ROUTES } from '@/shared/config/routes'

export const metadata: Metadata = {
  title: 'Create account — TermSync',
}

export default function RegisterPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Create account</h1>
        <RegisterForm />
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
        <OAuthButtons />
        <p className="mt-6 text-center text-sm text-gray-500">
          {'Already have an account? '}
          <Link href={ROUTES.login} className="font-medium text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
