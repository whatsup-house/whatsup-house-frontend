'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Coffee } from 'lucide-react'
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

interface DropdownOption<T extends string> {
  value: T
  label: string
}

interface CompactDropdownProps<T extends string> {
  value: T
  options: DropdownOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
}

function CompactDropdown<T extends string>({ value, options, onChange, ariaLabel }: CompactDropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find((option) => option.value === value) ?? options[0]

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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        className="flex h-8 items-center gap-1.5 rounded-full border border-tag-bg/70 bg-card px-2.5 text-xs font-semibold text-tag-text shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{current.label}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[112px] overflow-hidden rounded-xl border border-tag-bg/60 bg-card shadow-lg">
          <ul role="listbox" aria-label={ariaLabel} className="py-1">
            {options.map((option, index) => {
              const selected = option.value === value
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={`flex min-h-9 w-full items-center justify-between gap-2 px-3 text-left text-xs font-medium transition-colors ${
                      selected ? 'bg-primary-light text-primary' : 'text-foreground'
                    } ${index > 0 ? 'border-t border-tag-bg/40' : ''}`}
                  >
                    <span className="truncate">{option.label}</span>
                    {selected && <Check size={13} className="shrink-0" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function GatheringTypeCardView() {
  const t = useTranslations('gathering.typeView')
  const locale = useLocale()
  const router = useRouter()
  const [filter, setFilter] = useState<GatheringTypeFilter>('all')
  const [sort, setSort] = useState<GatheringTypeSort>('popular')
  const filterOptions = FILTERS.map((value) => ({ value, label: t(`filter.${value}`) }))
  const sortOptions = SORTS.map((value) => ({ value, label: t(`sort.${value}`) }))

  const { data, isLoading, isError, refetch } = useGatheringsAll()
  const { data: curated } = useCuratedGatherings()

  const today = dayjs().format('YYYY-MM-DD')
  const curatedTitles = curated?.map((c) => c.title) ?? []
  const cards = data ? buildGatheringTypeCards(data, { today, filter, sort, curatedTitles }) : []

  return (
    <div className="px-4">
      <div className="mb-3">
        <div className="mb-2 flex items-center gap-2">
          <div className="w-1 h-[18px] rounded-full bg-primary" />
          <h2 className="text-[20px] font-bold leading-snug text-foreground">{t('title')}</h2>
        </div>
        <div className="mb-2 h-px bg-tag-bg" />

        {/* 필터 / 정렬 */}
        <div className="flex justify-end gap-1.5">
          <CompactDropdown
            value={filter}
            options={filterOptions}
            onChange={setFilter}
            ariaLabel={t('filterLabel')}
          />
          <CompactDropdown
            value={sort}
            options={sortOptions}
            onChange={setSort}
            ariaLabel={t('sortLabel')}
          />
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
          <EmptyState icon={Coffee} illustration="/NoGathering.png" title={t('emptyTitle')} description={t('emptyDescription')} />
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
                {(card.categoryLabel ?? card.category) || (card.tags?.length ?? 0) > 0 ? (
                  <div className="flex flex-wrap gap-1 -mt-0.5">
                    {(card.categoryLabel ?? card.category) && (
                      <span className="rounded-full bg-primary-light px-1.5 py-0.5 text-[11px] font-medium text-primary">
                        {card.categoryLabel ?? card.category}
                      </span>
                    )}
                    {card.tags?.map((tag) => (
                      <span key={tag} className="rounded-full bg-tag-bg px-1.5 py-0.5 text-[11px] text-tag-text">
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                {card.displayDate ? (
                  <p className="text-xs text-tag-text line-clamp-1">
                    {card.representativeStatus === 'OPEN'
                      ? t('nearestOpen', { date: formatLocalizedShortDate(card.displayDate, locale) })
                      : formatLocalizedShortDate(card.displayDate, locale)}
                  </p>
                ) : (
                  <p className="text-xs text-tag-text line-clamp-1">
                    {t('noOpen')}
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
