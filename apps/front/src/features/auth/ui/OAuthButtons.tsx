'use client'

import { env } from '@/shared/config/env'

export function OAuthButtons(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <a
        href={`${env.NEXT_PUBLIC_API_URL}/auth/google`}
        className="flex items-center justify-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
      >
        Continue with Google
      </a>
      <a
        href={`${env.NEXT_PUBLIC_API_URL}/auth/github`}
        className="flex items-center justify-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
      >
        Continue with GitHub
      </a>
    </div>
  )
}
