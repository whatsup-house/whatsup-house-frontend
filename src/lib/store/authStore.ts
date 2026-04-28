import { create } from 'zustand'

interface AuthState {
  userId: string | null
  nickname: string | null
  isAdmin: boolean
  isLoggedIn: boolean
  isInitialized: boolean
  login: (userId: string, nickname: string, isAdmin: boolean) => void
  logout: () => void
  setInitialized: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  userId: null,
  nickname: null,
  isAdmin: false,
  isLoggedIn: false,
  isInitialized: false,
  login: (userId, nickname, isAdmin) =>
    set({ userId, nickname, isAdmin, isLoggedIn: true, isInitialized: true }),
  logout: () =>
    set({ userId: null, nickname: null, isAdmin: false, isLoggedIn: false }),
  setInitialized: () => set({ isInitialized: true }),
}))
