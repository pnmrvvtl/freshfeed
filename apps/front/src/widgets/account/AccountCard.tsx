'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useSession, SESSION_QUERY_KEY } from '@/entities/user/api'
import { apiClient } from '@/shared/api/client'
import { ROUTES } from '@/shared/config/routes'

export function AccountCard(): React.JSX.Element {
  const { user, isLoading, isAuthenticated } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.post<unknown>('/auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null)
      router.push(ROUTES.login)
    },
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm text-gray-500">You are not signed in.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Account</h2>
      <dl className="space-y-3">
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">Name</dt>
          <dd className="font-medium text-gray-900">{user.name}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">Email</dt>
          <dd className="font-medium text-gray-900">{user.email}</dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">Role</dt>
          <dd>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {user.role}
            </span>
          </dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">Email verified</dt>
          <dd>
            {user.emailVerified ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Verified
              </span>
            ) : (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                Unverified
              </span>
            )}
          </dd>
        </div>
        <div className="flex justify-between text-sm">
          <dt className="text-gray-500">Member since</dt>
          <dd className="font-medium text-gray-900">
            {new Date(user.createdAt).toLocaleDateString()}
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <button
          onClick={() => {
            logoutMutation.mutate()
          }}
          disabled={logoutMutation.isPending}
          className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}
