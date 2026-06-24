'use client'

import { useState } from 'react'
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
import { useCuratedGatherings } from '@/lib/hooks/useHome'
import {
  buildGatheringTypeCards,
  type GatheringTypeFilter,
  type GatheringTypeSort,
} from '@/lib/utils/gatheringGroup'
import { formatLocalizedShortDate } from '@/lib/utils/date'

const FILTERS: GatheringTypeFilter[] = ['all', 'open', 'completed']
const SORTS: GatheringTypeSort[] = ['popular', 'latest', 'oldest']

export default function GatheringTypeCardView() {
  const t = useTranslations('gathering.typeView')
  const locale = useLocale()
  const router = useRouter()
  const [filter, setFilter] = useState<GatheringTypeFilter>('all')
  const [sort, setSort] = useState<GatheringTypeSort>('popular')

  const { data, isLoading, isError, refetch } = useGatheringsAll()
  const { data: curated } = useCuratedGatherings()

  const today = dayjs().format('YYYY-MM-DD')
  const curatedTitles = curated?.map((c) => c.title) ?? []
  const cards = data ? buildGatheringTypeCards(data, { today, filter, sort, curatedTitles }) : []

  return (
    <div className="px-4">
      <h2 className="text-base font-semibold text-foreground mb-3">{t('title')}</h2>

      {/* 필터 / 정렬 */}
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
              }`}
            >
              {t(`filter.${f}`)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {SORTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                sort === s ? 'bg-primary/10 text-primary' : 'text-tag-text'
              }`}
            >
              {t(`sort.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      )}

      {isError && <ApiErrorMessage onRetry={refetch} />}

      {!isLoading && !isError && cards.length === 0 && (
        <div className="border border-dashed border-tag-bg rounded-card">
          <EmptyState icon={Coffee} title={t('emptyTitle')} description={t('emptyDescription')} />
        </div>
      )}

      {!isLoading && !isError && cards.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {cards.map((card) => (
            <button
              key={card.title}
              type="button"
              onClick={() => router.push(`/gatherings/${card.representativeId}`)}
              className="flex flex-col rounded-card bg-card shadow-sm overflow-hidden text-left"
            >
              <div className="relative w-full aspect-square bg-tag-bg">
                {card.thumbnailUrl ? (
                  <AppImage
                    src={card.thumbnailUrl}
                    alt={card.title}
                    className="object-cover"
                    sizes="(max-width: 390px) 50vw, 195px"
                  />
                ) : (
                  <div className="h-full w-full bg-tag-bg" />
                )}
                {card.representativeStatus !== 'OPEN' && <div className="absolute inset-0 bg-black/40" />}
                <div className="absolute top-2 right-2">
                  <Badge variant={card.representativeStatus} />
                </div>
              </div>

              <div className="flex flex-col gap-1 p-3">
                <h3 className="text-sm font-semibold leading-snug text-foreground line-clamp-1">
                  {card.title}
                </h3>
                {card.displayDate && (
                  <p className="text-xs text-tag-text line-clamp-1">
                    {formatLocalizedShortDate(card.displayDate, locale)}
                  </p>
                )}
                <p className="text-[11px] text-tag-text/70">
                  {t('scheduleCount', { count: card.totalCount })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
