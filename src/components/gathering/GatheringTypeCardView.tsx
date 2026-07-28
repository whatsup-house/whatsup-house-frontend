'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Coffee, SlidersHorizontal } from 'lucide-react'
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
// 대략 사용 빈도 순. 게더링 tags는 자유 입력이라, 여기 없는 태그는 필터로 잡히지 않는다.
const TAG_FILTERS = ['푸드', '파티', '소셜', '대화', '자기계발', '외국어', '취미', '게임', '액티비티', '나들이']

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
                    className={`flex min-h-9 w-full items-center justify-between gap-2 px-3 text-left text-xs font-medium transition-colors ${selected ? 'bg-primary-light text-primary' : 'text-foreground'
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

interface TagFilterButtonProps {
  selectedTags: string[]
  onToggleTag: (tag: string) => void
  onClear: () => void
}

function TagFilterButton({ selectedTags, onToggleTag, onClear }: TagFilterButtonProps) {
  const [open, setOpen] = useState(false)
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        className={`relative flex h-8 min-w-8 items-center justify-center rounded-full border px-2 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
          open ? 'z-40' : ''
        } ${
          selectedTags.length > 0
            ? 'border-primary bg-primary-light text-primary'
            : 'border-tag-bg/70 bg-card text-tag-text'
        }`}
        aria-label="태그 필터"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <SlidersHorizontal size={16} />
        {selectedTags.length > 0 && (
          <span className="ml-1 min-w-4 rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-white">
            {selectedTags.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="태그 필터"
            className="absolute right-0 top-[calc(100%+10px)] z-30 w-[calc(100vw-32px)] max-w-[320px] overflow-visible rounded-card border border-tag-bg bg-background shadow-lg"
          >
            <span className="absolute -top-2 right-3 h-4 w-4 rotate-45 border-l border-t border-tag-bg bg-background" />
            <div className="relative z-10 rounded-card bg-background p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">태그</p>
                {selectedTags.length > 0 && (
                  <button
                    type="button"
                    onClick={onClear}
                    className="rounded-full px-2 py-1 text-xs font-medium text-tag-text transition-colors hover:bg-tag-bg"
                  >
                    초기화
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TAG_FILTERS.map((tag) => {
                  const selected = selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onToggleTag(tag)}
                      className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition-colors ${
                        selected
                          ? 'bg-primary text-white'
                          : 'bg-tag-bg text-tag-text hover:bg-primary-light hover:text-primary'
                      }`}
                      aria-pressed={selected}
                    >
                      {selected && <Check size={12} />}
                      #{tag}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </>
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
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const filterOptions = FILTERS.map((value) => ({ value, label: t(`filter.${value}`) }))
  const sortOptions = SORTS.map((value) => ({ value, label: t(`sort.${value}`) }))

  const { data, isLoading, isError, refetch } = useGatheringsAll()
  const { data: curated } = useCuratedGatherings()

  const today = dayjs().format('YYYY-MM-DD')
  const curatedTitles = useMemo(() => curated?.map((c) => c.title) ?? [], [curated])
  const cardsByStatus = useMemo(
    () => (data ? buildGatheringTypeCards(data, { today, filter, sort, curatedTitles }) : []),
    [data, today, filter, sort, curatedTitles],
  )
  const cards = useMemo(() => {
    if (selectedTags.length === 0) return cardsByStatus
    return cardsByStatus.filter((card) => card.tags?.some((tag) => selectedTags.includes(tag)))
  }, [cardsByStatus, selectedTags])

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) => (
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    ))
  }

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
          <TagFilterButton
            selectedTags={selectedTags}
            onToggleTag={handleToggleTag}
            onClear={() => setSelectedTags([])}
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
                    style={card.title === '우연한 식탁' ? { objectPosition: 'center 32%' } : undefined}
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
                {(card.tags?.length ?? 0) > 0 ? (
                  <div className="flex flex-wrap gap-1 -mt-0.5">
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
