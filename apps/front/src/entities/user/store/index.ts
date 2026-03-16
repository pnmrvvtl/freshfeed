'use client'

import { create } from 'zustand'
import type { User } from '../model'

interface UserStore {
  user: User | null
  setUser: (user: User | null) => void
  clear: () => void
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => {
    set({ user })
  },
  clear: () => {
    set({ user: null })
  },
}))
