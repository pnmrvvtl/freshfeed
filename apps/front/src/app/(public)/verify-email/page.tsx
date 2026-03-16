import { Suspense } from 'react'
import type { Metadata } from 'next'
import { VerifyEmailView } from '@/features/auth/ui/VerifyEmailView'

export const metadata: Metadata = {
  title: 'Verify email — TermSync',
}

export default function VerifyEmailPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Verify your email</h1>
        <Suspense fallback={<p className="text-sm text-gray-500">Loading...</p>}>
          <VerifyEmailView />
        </Suspense>
      </div>
    </main>
  )
}
