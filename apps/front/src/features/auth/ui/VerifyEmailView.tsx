'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/client'
import { resendVerificationSchema, type ResendVerificationFormValues } from '../model/schemas'
import { ROUTES } from '@/shared/config/routes'

function useVerifyToken(token: string | null): {
  status: 'idle' | 'success' | 'error'
  message: string
} {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token || token.length === 0) {
      setStatus('error')
      setMessage('No verification token found.')
      return
    }

    let cancelled = false

    void apiClient
      .post<unknown>('/auth/verify-email', { token })
      .then(() => {
        if (!cancelled) {
          setStatus('success')
          setMessage('Email verified successfully!')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error')
          setMessage('Verification failed. The link may have expired or already been used.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [token])

  return { status, message }
}

export function VerifyEmailView(): React.JSX.Element {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const { status, message } = useVerifyToken(token)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ResendVerificationFormValues>({ resolver: zodResolver(resendVerificationSchema) })

  const resendMutation = useMutation({
    mutationFn: (data: ResendVerificationFormValues) =>
      apiClient.post<unknown>('/auth/resend-verification', data),
    onError: () => {
      setError('root', { message: 'Failed to send verification email. Please try again.' })
    },
  })

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="font-medium text-green-600">{message}</p>
        <button
          onClick={() => {
            router.push(ROUTES.login)
          }}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Go to login
        </button>
      </div>
    )
  }

  if (status === 'error' && token) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-red-600">{message}</p>
        <form
          onSubmit={(e) => {
            void handleSubmit((data) => {
              resendMutation.mutate(data)
            })(e)
          }}
          className="flex flex-col gap-4"
        >
          <label htmlFor="email" className="text-sm font-medium">
            Resend verification to:
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            placeholder="your@email.com"
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          {errors.root && <p className="text-xs text-red-600">{errors.root.message}</p>}
          {resendMutation.isSuccess && (
            <p className="text-xs text-green-600">Verification email sent!</p>
          )}
          <button
            type="submit"
            disabled={resendMutation.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {resendMutation.isPending ? 'Sending...' : 'Resend verification email'}
          </button>
        </form>
      </div>
    )
  }

  return <p className="text-sm text-gray-500">Verifying your email...</p>
}
