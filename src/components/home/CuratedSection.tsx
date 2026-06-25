'use client'

import { useRouter } from 'next/navigation'
import { Flame } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import AppImage from '@/components/ui/AppImage'
import { useCuratedGatherings } from '@/lib/hooks/useHome'
import { formatLocalizedShortDate } from '@/lib/utils/date'
import { getEffectiveStatus } from '@/lib/utils/gatheringStatus'

export default function CuratedSection() {
  const t = useTranslations('home.curated')
  const locale = useLocale()
  const router = useRouter()
  const { data, isLoading } = useCuratedGatherings()
  const gatherings = data ?? []

  if (isLoading) {
    return (
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <Flame size={14} className="text-primary fill-primary" strokeWidth={0} />
          <span className="text-[15px] font-bold text-foreground">{t('title')}</span>
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 bg-card rounded-2xl p-2.5 border border-tag-bg/40 animate-pulse">
              <div className="w-7 h-7 bg-tag-bg rounded flex-shrink-0" />
              <div className="w-12 h-12 bg-tag-bg rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-tag-bg rounded w-3/4" />
                <div className="h-2.5 bg-tag-bg rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (gatherings.length === 0) return null

  return (
    <div className="px-4 pt-5 pb-2">
      <div className="flex items-center gap-2 mb-3">
        <Flame size={14} className="text-primary fill-primary" strokeWidth={0} />
        <span className="text-[15px] font-bold text-foreground">{t('title')}</span>
      </div>
      <div className="flex flex-col gap-3">
        {gatherings.map((item, index) => {
          const effectiveStatus = getEffectiveStatus(item.status, item.eventDate)
          const scheduleText = effectiveStatus === 'OPEN'
            ? t('nearestOpen', { date: formatLocalizedShortDate(item.eventDate, locale) })
            : t('noOpen')

          return (
            <button
              key={item.id}
              type="button"
              aria-label={t('rankLabel', { rank: index + 1, title: item.title })}
              className="flex items-center gap-3 bg-card rounded-2xl p-2.5 border border-tag-bg/40 text-left w-full"
              onClick={() => router.push(`/gatherings/${item.id}`)}
            >
              <span
                className={`w-7 text-center text-lg font-bold flex-shrink-0 ${
                  index === 0 ? 'text-primary' : 'text-tag-text'
                }`}
              >
                {index + 1}
              </span>
              <div className="relative w-12 h-12 flex-shrink-0 bg-tag-bg rounded-xl overflow-hidden">
                {item.thumbnailUrl && (
                  <AppImage
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="object-cover"
                    sizes="48px"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                <p className="text-[11px] text-tag-text/70 mt-0.5 truncate">{scheduleText}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
