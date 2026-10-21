import { create } from 'zustand'

export interface DialogOptions {
  title?: string
  confirmLabel?: string
  destructive?: boolean // 되돌리기 어려운 동작 — 처음 포커스를 취소에 둔다
}

interface DialogRequest extends DialogOptions {
  kind: 'alert' | 'confirm'
  message: string
  resolve: (ok: boolean) => void
}

interface DialogState {
  queue: DialogRequest[] // 맨 앞이 지금 떠 있는 창. 열린 동안 들어온 요청은 뒤에 줄 선다
  close: (ok: boolean) => void
}

// 와썹이 알림창 (KAN-441). 브라우저 alert·confirm 대신 DialogHost 가 띄운다.
export const useDialogStore = create<DialogState>((set, get) => ({
  queue: [],
  close: (ok) => {
    const [current, ...rest] = get().queue
    if (!current) return
    set({ queue: rest })
    current.resolve(ok)
  },
}))

const open = (request: Omit<DialogRequest, 'resolve'>) =>
  new Promise<boolean>((resolve) => {
    useDialogStore.setState((s) => ({ queue: [...s.queue, { ...request, resolve }] }))
  })

export const showAlert = async (message: string, options: Pick<DialogOptions, 'title'> = {}): Promise<void> => {
  await open({ kind: 'alert', message, ...options })
}

export const showConfirm = (message: string, options: DialogOptions = {}): Promise<boolean> =>
  open({ kind: 'confirm', message, ...options })
