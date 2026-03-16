'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession, SESSION_QUERY_KEY } from '@/entities/user/api'
import { apiClient } from '@/shared/api/client'
import { ROUTES } from '@/shared/config/routes'

export function HeaderWidget(): React.JSX.Element {
  const { user, isAuthenticated } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.post<unknown>('/auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null)
      router.push(ROUTES.login)
    },
  })

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href={ROUTES.home} className="text-lg font-bold tracking-tight text-blue-600">
          TermSync
        </Link>

        <nav className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link href={ROUTES.dashboard} className="text-sm text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <span className="text-sm text-gray-400">{user?.email}</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {user?.role ?? 'FREE'}
              </span>
              <button
                onClick={() => {
                  logoutMutation.mutate()
                }}
                disabled={logoutMutation.isPending}
                className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
              >
                {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
              </button>
            </>
          ) : (
            <>
              <Link href={ROUTES.login} className="text-sm text-gray-600 hover:text-gray-900">
                Sign in
              </Link>
              <Link
                href={ROUTES.register}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
