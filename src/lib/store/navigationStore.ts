import { create } from 'zustand'

interface NavigationState {
  stack: string[]
  push: (path: string) => void
  back: () => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  stack: [],
  push: (path) =>
    set((state) => {
      const last = state.stack[state.stack.length - 1]
      if (last === path) return state
      return { stack: [...state.stack, path] }
    }),
  back: () =>
    set((state) => ({
      stack: state.stack.slice(0, -1),
    })),
}))
