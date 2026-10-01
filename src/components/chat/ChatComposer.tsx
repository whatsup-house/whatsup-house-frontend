'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { ArrowUp, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useToastStore } from '@/lib/store/toastStore'
import { CHAT_IMAGE_MAX_BYTES, compressChatImage } from '@/lib/utils/chatImage'

const MAX_LENGTH = 2000

interface ChatComposerProps {
  disabled: boolean
  // 뮤트 등으로 보낼 수 없을 때 입력창 자리에 보여줄 안내
  disabledReason: string | null
  onSendText: (text: string) => void
  onSendImage: (image: Blob) => void
}

export default function ChatComposer({ disabled, disabledReason, onSendText, onSendImage }: ChatComposerProps) {
  const t = useTranslations('chat.composer')
  const showToast = useToastStore((s) => s.show)
  const [text, setText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const isDisabled = disabled || disabledReason !== null
  const canSend = !isDisabled && text.trim().length > 0

  // 내용에 맞춰 높이를 늘린다. 최대 4줄은 max-h 가 막고 넘치면 내부 스크롤.
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [text])

  const submit = () => {
    if (!canSend) return
    onSendText(text.trim())
    setText('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // 한글 조합 중 Enter 는 조합 확정용이라 전송하지 않는다
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setIsProcessing(true)
    try {
      const image = await compressChatImage(file)
      if (image.size > CHAT_IMAGE_MAX_BYTES) {
        showToast(t('imageTooLarge'), 'error')
        return
      }
      onSendImage(image)
    } catch {
      showToast(t('imageFailed'), 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="shrink-0 border-t border-tag-bg bg-card px-2 pt-2 pb-[max(env(safe-area-inset-bottom),8px)]">
      <div className="flex items-end gap-1.5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isDisabled || isProcessing}
          aria-busy={isProcessing}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-tag-text disabled:opacity-40 transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={t('attachImage')}
        >
          <Plus size={22} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          placeholder={disabledReason ?? t('placeholder')}
          maxLength={MAX_LENGTH}
          rows={1}
          aria-label={t('placeholder')}
          className="max-h-[100px] min-h-10 flex-1 resize-none rounded-[20px] bg-tag-bg px-4 py-2.5 text-[15px] leading-5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40 placeholder:text-tag-text/70 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tag-text text-background disabled:bg-tag-bg disabled:text-tag-text/40 transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={t('send')}
        >
          <ArrowUp size={20} />
        </button>
      </div>
      {text.length > 0 && (
        <p className="mt-1 pr-12 text-right text-xs text-tag-text/70">
          {text.length}/{MAX_LENGTH}
        </p>
      )}
    </div>
  )
}
