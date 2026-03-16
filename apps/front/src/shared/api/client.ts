import { env } from '../config/env'
import { ROUTES } from '../config/routes'

interface ApiError {
  data: null
  meta: {
    statusCode: number
    message: string
    timestamp: string
    path: string
  }
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>).data === null &&
    typeof (value as Record<string, unknown>).meta === 'object'
  )
}

function hasDataField(value: unknown): value is { data: unknown } {
  return typeof value === 'object' && value !== null && 'data' in value
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

type PendingCallback = (success: boolean) => void

let isRefreshing = false
let pendingRequests: PendingCallback[] = []

function drainPendingRequests(success: boolean): void {
  pendingRequests.forEach((resolve) => {
    resolve(success)
  })
  pendingRequests = []
}

async function attemptRefresh(): Promise<boolean> {
  if (isRefreshing) {
    return new Promise<boolean>((resolve) => {
      pendingRequests.push(resolve)
    })
  }

  isRefreshing = true

  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })

    if (!res.ok) {
      drainPendingRequests(false)
      return false
    }

    drainPendingRequests(true)
    return true
  } catch {
    drainPendingRequests(false)
    return false
  } finally {
    isRefreshing = false
  }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${env.NEXT_PUBLIC_API_URL}${path}`
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(init?.headers ?? {}),
    },
  })

  if (res.status === 401) {
    const refreshed = await attemptRefresh()
    if (!refreshed) {
      if (typeof window !== 'undefined') {
        window.location.href = ROUTES.login
      }
      throw new HttpError(401, 'Unauthorized')
    }

    const retryRes = await fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(init?.headers ?? {}),
      },
    })

    if (!retryRes.ok) {
      const body: unknown = await retryRes.json()
      const message = isApiError(body) ? body.meta.message : 'Request failed'
      throw new HttpError(retryRes.status, message)
    }

    const retryBody: unknown = await retryRes.json()
    if (!hasDataField(retryBody)) throw new HttpError(500, 'Unexpected response format')
    return retryBody.data as T
  }

  if (!res.ok) {
    const body: unknown = await res.json()
    const message = isApiError(body) ? body.meta.message : 'Request failed'
    throw new HttpError(res.status, message)
  }

  const body: unknown = await res.json()
  if (!hasDataField(body)) throw new HttpError(500, 'Unexpected response format')
  return body.data as T
}

export const apiClient = {
  get: <T>(path: string): Promise<T> => apiRequest<T>(path, { method: 'GET' }),
  post: <T>(path: string, data?: unknown): Promise<T> =>
    apiRequest<T>(path, {
      method: 'POST',
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    }),
  put: <T>(path: string, data?: unknown): Promise<T> =>
    apiRequest<T>(path, {
      method: 'PUT',
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    }),
  delete: <T>(path: string): Promise<T> => apiRequest<T>(path, { method: 'DELETE' }),
}
