import { beforeEach, describe, expect, it } from 'vitest'
import { useUserStore } from './index'
import type { User } from '../model'

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'FREE',
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

describe('useUserStore', () => {
  beforeEach(() => {
    useUserStore.setState({ user: null })
  })

  it('has null user as initial state', () => {
    const { user } = useUserStore.getState()
    expect(user).toBeNull()
  })

  it('setUser stores the provided user', () => {
    useUserStore.getState().setUser(mockUser)
    expect(useUserStore.getState().user).toEqual(mockUser)
  })

  it('setUser with null clears the user', () => {
    useUserStore.getState().setUser(mockUser)
    useUserStore.getState().setUser(null)
    expect(useUserStore.getState().user).toBeNull()
  })

  it('clear resets user to null', () => {
    useUserStore.setState({ user: mockUser })
    useUserStore.getState().clear()
    expect(useUserStore.getState().user).toBeNull()
  })

  it('preserves user reference after multiple setUser calls', () => {
    const anotherUser: User = { ...mockUser, id: 'user-2', email: 'other@example.com' }
    useUserStore.getState().setUser(mockUser)
    useUserStore.getState().setUser(anotherUser)
    expect(useUserStore.getState().user).toEqual(anotherUser)
  })
})
