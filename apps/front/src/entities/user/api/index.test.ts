import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useSession } from './index'
import type { User } from '../model'

vi.mock('@/shared/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

vi.mock('@/shared/config/routes', () => ({
  ROUTES: {
    login: '/login',
    dashboard: '/dashboard',
  },
}))

import { apiClient } from '@/shared/api/client'

const mockGet = vi.mocked(apiClient.get)

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'FREE',
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

function makeWrapper(): ({ children }: { children: ReactNode }) => ReactNode {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }) => QueryClientProvider({ client: queryClient, children })
}

describe('useSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns isLoading true while fetching', () => {
    mockGet.mockReturnValue(new Promise(() => undefined))

    const { result } = renderHook(() => useSession(), { wrapper: makeWrapper() })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('returns authenticated user when session fetch succeeds', async () => {
    mockGet.mockResolvedValue(mockUser)

    const { result } = renderHook(() => useSession(), { wrapper: makeWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(mockUser)
  })

  it('returns null user when session fetch throws', async () => {
    mockGet.mockRejectedValue(new Error('Unauthorized'))

    const { result } = renderHook(() => useSession(), { wrapper: makeWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('returns null user when API response fails schema validation', async () => {
    mockGet.mockResolvedValue({ invalidShape: true })

    const { result } = renderHook(() => useSession(), { wrapper: makeWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })
})
