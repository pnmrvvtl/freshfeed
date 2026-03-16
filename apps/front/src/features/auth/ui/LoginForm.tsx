'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiClient, HttpError } from '@/shared/api/client'
import { loginSchema, type LoginFormValues } from '../model/schemas'
import type { User } from '@/entities/user/model'
import { SESSION_QUERY_KEY } from '@/entities/user/api'
import { ROUTES } from '@/shared/config/routes'

export function LoginForm(): React.JSX.Element {
  const router = useRouter()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const loginMutation = useMutation({
    mutationFn: (data: LoginFormValues) => apiClient.post<User>('/auth/login', data),
    onSuccess: (user) => {
      void queryClient.setQueryData(SESSION_QUERY_KEY, user)
      router.push(ROUTES.dashboard)
    },
    onError: (error: Error) => {
      const message =
        error instanceof HttpError && error.status === 403
          ? 'Please verify your email before signing in. Check your inbox or resend below.'
          : 'Invalid email or password.'
      setError('root', { message })
    },
  })

  const onSubmit = (data: LoginFormValues): void => {
    loginMutation.mutate(data)
  }

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e)
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
      </div>

      {errors.root && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{errors.root.message}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || loginMutation.isPending}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}
