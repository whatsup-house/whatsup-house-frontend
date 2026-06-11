import { create } from 'zustand'

interface ToastState {
  message: string | null
  // 토스트를 띄운다. 페이지 이동(예: 회원가입 완료 후 홈 이동) 후에도 유지된다. (KAN-227)
  show: (message: string) => void
  clear: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  clear: () => set({ message: null }),
}))
