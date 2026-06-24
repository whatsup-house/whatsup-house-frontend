'use client'

import { useRouter } from 'next/navigation'
import { Coffee } from 'lucide-react'
import dayjs from 'dayjs'
import { useLocale, useTranslations } from 'next-intl'
import Badge from '@/components/ui/Badge'
import AppImage from '@/components/ui/AppImage'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ApiErrorMessage from '@/components/ui/ApiErrorMessage'
import EmptyState from '@/components/ui/EmptyState'
import { useGatheringsAll } from '@/lib/hooks/useGatherings'
import { groupGatheringsByType } from '@/lib/utils/gatheringGroup'
import { formatLocalizedShortDate } from '@/lib/utils/date'

export default function GatheringTypeCardView() {
  const t = useTranslations('gathering.typeView')
  const locale = useLocale()
  const router = useRouter()
  const { data, isLoading, isError, refetch } = useGatheringsAll()

  const today = dayjs().format('YYYY-MM-DD')
  const groups = data ? groupGatheringsByType(data, today) : []

  return (
    <div className="px-4">
      <h2 className="text-base font-semibold text-foreground mb-3">{t('title')}</h2>

      {isLoading && (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      )}

      {isError && <ApiErrorMessage onRetry={refetch} />}

      {!isLoading && !isError && groups.length === 0 && (
        <div className="border border-dashed border-tag-bg rounded-card">
          <EmptyState icon={Coffee} title={t('emptyTitle')} description={t('emptyDescription')} />
        </div>
      )}

      {!isLoading && !isError && groups.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {groups.map((group) => (
            <button
              key={group.title}
              type="button"
              onClick={() => router.push(`/gatherings/${group.representativeId}`)}
              className="flex flex-col rounded-card bg-card shadow-sm overflow-hidden text-left"
            >
              <div className="relative w-full aspect-square bg-tag-bg">
                {group.thumbnailUrl ? (
                  <AppImage
                    src={group.thumbnailUrl}
                    alt={group.title}
                    className="object-cover"
                    sizes="(max-width: 390px) 50vw, 195px"
                  />
                ) : (
                  <div className="h-full w-full bg-tag-bg" />
                )}
                {!group.nearestOpenDate && <div className="absolute inset-0 bg-black/40" />}
                <div className="absolute top-2 right-2">
                  <Badge variant={group.nearestOpenDate ? 'OPEN' : group.representativeStatus} />
                </div>
              </div>

              <div className="flex flex-col gap-1 p-3">
                <h3 className="text-sm font-semibold leading-snug text-foreground line-clamp-1">
                  {group.title}
                </h3>
                {group.nearestOpenDate ? (
                  <p className="text-xs text-tag-text line-clamp-1">
                    {t('nearestOpen', { date: formatLocalizedShortDate(group.nearestOpenDate, locale) })}
                  </p>
                ) : (
                  <p className="text-xs text-tag-text line-clamp-1">
                    {t('noOpen', { date: formatLocalizedShortDate(group.representativeDate, locale) })}
                  </p>
                )}
                <p className="text-[11px] text-tag-text/70">
                  {t('scheduleCount', { count: group.totalCount })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
