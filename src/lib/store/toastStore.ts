import { create } from 'zustand'

interface ToastState {
  message: string | null
  variant: 'default' | 'welcome'
  // 토스트를 띄운다. 페이지 이동(예: 회원가입 완료 후 홈 이동) 후에도 유지된다. (KAN-227)
  show: (message: string, variant?: ToastState['variant']) => void
  clear: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  variant: 'default',
  show: (message, variant = 'default') => set({ message, variant }),
  clear: () => set({ message: null, variant: 'default' }),
}))
