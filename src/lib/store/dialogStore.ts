import { create } from 'zustand'

export interface DialogOptions {
  title?: string
  confirmLabel?: string
  destructive?: boolean // 되돌리기 어려운 동작 — 처음 포커스를 취소에 둔다
}

type DialogResult = boolean | string | null

interface DialogRequest extends DialogOptions {
  kind: 'alert' | 'confirm' | 'prompt'
  message: string
  defaultValue?: string // prompt 입력칸 처음 값
  resolve: (result: DialogResult) => void
}

interface DialogState {
  queue: DialogRequest[] // 맨 앞이 지금 떠 있는 창. 열린 동안 들어온 요청은 뒤에 줄 선다
  close: (result: DialogResult) => void
}

// 와썹이 알림창 (KAN-441). 브라우저 alert·confirm 대신 DialogHost 가 띄운다.
export const useDialogStore = create<DialogState>((set, get) => ({
  queue: [],
  close: (result) => {
    const [current, ...rest] = get().queue
    if (!current) return
    set({ queue: rest })
    current.resolve(result)
  },
}))

const open = (request: Omit<DialogRequest, 'resolve'>) =>
  new Promise<DialogResult>((resolve) => {
    useDialogStore.setState((s) => ({ queue: [...s.queue, { ...request, resolve }] }))
  })

export const showAlert = async (message: string, options: Pick<DialogOptions, 'title'> = {}): Promise<void> => {
  await open({ kind: 'alert', message, ...options })
}

export const showConfirm = async (message: string, options: DialogOptions = {}): Promise<boolean> =>
  (await open({ kind: 'confirm', message, ...options })) === true

// 브라우저 prompt 대신. 확인이면 입력값(빈 문자열 포함), 취소·Esc 면 null
export const showPrompt = async (message: string, options: DialogOptions & { defaultValue?: string } = {}): Promise<string | null> => {
  const result = await open({ kind: 'prompt', message, ...options })
  return typeof result === 'string' ? result : null
}
