'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../shared/api/client'
import { userSchema } from '../model'
import type { User } from '../model'

export const SESSION_QUERY_KEY = ['session'] as const

async function fetchSession(): Promise<User | null> {
  try {
    const data = await apiClient.get<unknown>('/auth/me')
    const parsed = userSchema.safeParse(data)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function useSession(): {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
} {
  const { data, isLoading } = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
  })

  return {
    user: data ?? null,
    isLoading,
    isAuthenticated: data != null,
  }
}
