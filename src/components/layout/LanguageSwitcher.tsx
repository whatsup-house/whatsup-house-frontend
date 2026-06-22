'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Globe, Check } from 'lucide-react'
import { locales, type Locale } from '@/i18n/config'
import { setUserLocale } from '@/i18n/locale'

// 헤더 언어 선택 UI: 지구본 아이콘 버튼 + 드롭다운. 선택값은 쿠키에 저장되고
// 서버 액션 호출로 현재 라우트가 재렌더되어 새 로케일이 반영된다. (KAN-264)
export default function LanguageSwitcher() {
  const locale = useLocale()
  const t = useTranslations('language')
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleSelect = (next: Locale) => {
    setOpen(false)
    if (next === locale) return
    startTransition(() => {
      setUserLocale(next)
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={isPending}
        className="min-w-[36px] min-h-[36px] flex items-center justify-center text-foreground disabled:opacity-50"
        aria-label={t('label')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe size={20} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-40 mt-1 min-w-[128px] rounded-card border border-tag-bg bg-card py-1 shadow-lg"
        >
          {locales.map((code) => (
            <li key={code}>
              <button
                type="button"
                role="option"
                aria-selected={locale === code}
                onClick={() => handleSelect(code)}
                className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-sm min-h-[44px] ${
                  locale === code ? 'text-foreground font-medium' : 'text-tag-text'
                }`}
              >
                {t(code)}
                {locale === code && <Check size={16} className="text-primary" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
