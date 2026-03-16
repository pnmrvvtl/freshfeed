import type { Metadata } from 'next'
import Link from 'next/link'
import { ROUTES } from '@/shared/config/routes'

export const metadata: Metadata = {
  title: 'Upgrade — TermSync',
}

export default function UpgradePage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Upgrade to Pro</h1>
        <p className="mb-6 text-gray-500">
          Unlock 3-level synonym trees and custom email schedules.
        </p>
        <Link
          href={ROUTES.dashboard}
          className="rounded bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Go back to dashboard
        </Link>
      </div>
    </main>
  )
}
