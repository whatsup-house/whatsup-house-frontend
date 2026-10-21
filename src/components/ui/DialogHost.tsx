'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useDialogStore } from '@/lib/store/dialogStore'
import Button from './Button'

interface DialogHostProps {
  /** AppShell 프레임 안에 마운트될 때 true — ToastHost 와 같은 기준으로 가운데 정렬한다. */
  inFrame?: boolean
}

// 와썹이 알림창 호스트 (KAN-441). showAlert·showConfirm 이 큐에 넣은 창을 하나씩 띄운다.
// 카드 모양은 ToastHost welcome 변형과 같다. Esc = 취소, Tab 은 창 안에서 돈다, 닫히면 원래 포커스로 돌아간다.
export default function DialogHost({ inFrame = false }: DialogHostProps) {
  const t = useTranslations('common')
  const current = useDialogStore((s) => s.queue[0])
  const close = useDialogStore((s) => s.close)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!current) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogRef.current?.querySelector<HTMLButtonElement>('[data-initial-focus]')?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 뒤에 깔린 모달의 Esc 처리까지 닿지 않게 여기서 끊는다
        e.preventDefault()
        e.stopPropagation()
        close(false)
        return
      }
      if (e.key !== 'Tab') return
      const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      if (buttons.length === 0) return
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      const inside = dialogRef.current?.contains(document.activeElement) ?? false
      if (e.shiftKey && (!inside || document.activeElement === first)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      previous?.focus()
    }
  }, [current, close])

  if (!current) return null

  const isConfirm = current.kind === 'confirm'
  const [heading, ...bodyLines] = current.title
    ? [current.title, ...current.message.split('\n')]
    : current.message.split('\n')
  const body = bodyLines.filter(Boolean)
  const position = inFrame ? 'fixed lg:absolute' : 'fixed'

  return (
    <div className={`${position} inset-0 z-[110] flex items-center justify-center bg-foreground/30 px-6`}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="wassup-dialog-title"
        aria-describedby={body.length > 0 ? 'wassup-dialog-body' : undefined}
        className="w-full max-w-[360px] rounded-card bg-card px-6 py-7 text-center shadow-xl"
      >
        <Image src="/assets/wassup-mascot.png" alt="" width={66} height={86} className="mx-auto mb-4" />
        <p id="wassup-dialog-title" className={`whitespace-pre-line text-lg font-bold ${current.destructive ? 'text-primary' : 'text-foreground'}`}>
          {heading}
        </p>
        {body.length > 0 && (
          <div id="wassup-dialog-body" className="mt-3 space-y-1.5 text-sm leading-relaxed text-tag-text">
            {body.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}
        <div className="mt-6 flex gap-2">
          {isConfirm && (
            <Button
              data-initial-focus={current.destructive || undefined}
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => close(false)}
            >
              {t('cancel')}
            </Button>
          )}
          <Button
            data-initial-focus={!(current.destructive && isConfirm) || undefined}
            size="sm"
            className="flex-1"
            onClick={() => close(true)}
          >
            {current.confirmLabel ?? t('confirm')}
          </Button>
        </div>
      </div>
    </div>
  )
}
