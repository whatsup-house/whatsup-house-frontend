'use client'

import { useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Languages } from 'lucide-react'
import { locales, localeLabels, type Locale } from '@/i18n/config'
import { setUserLocale } from '@/i18n/locale'

// 언어 선택 UI. 선택값은 쿠키에 저장되고 서버 액션 호출로 현재 라우트가 재렌더된다. (KAN-264)
export default function LanguageSwitcher() {
  const locale = useLocale()
  const t = useTranslations('language')
  const [isPending, startTransition] = useTransition()

  const handleChange = (next: Locale) => {
    if (next === locale) return
    startTransition(() => {
      setUserLocale(next)
    })
  }

  return (
    <label className="relative inline-flex items-center gap-1 text-tag-text">
      <Languages size={16} aria-hidden="true" />
      <span className="sr-only">{t('label')}</span>
      <select
        value={locale}
        onChange={(event) => handleChange(event.target.value as Locale)}
        disabled={isPending}
        aria-label={t('label')}
        className="min-h-[44px] bg-transparent text-sm text-foreground focus:outline-none disabled:opacity-50"
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {localeLabels[code]}
          </option>
        ))}
      </select>
    </label>
  )
}
