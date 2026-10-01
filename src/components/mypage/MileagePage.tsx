'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ArrowDownUp } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import dayjs from 'dayjs'
import { Button } from '@/components/ui'
import { useMyMileageBalance, useMyMileageHistory } from '@/lib/hooks/useMileage'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import type { MileageHistoryItem, MileageType } from '@/lib/api/types'

function getTypeLabel(type: MileageType, amount: number, t: (key: string) => string): string {
  if (type === 'ADMIN_ADJUST') {
    return amount > 0 ? t('typeLabels.ADMIN_ADJUST_EARN') : t('typeLabels.ADMIN_ADJUST_USE')
  }
  return t(`typeLabels.${type}`)
}

type FilterKind = 'ALL' | 'EARN' | 'USE'
type SortOrder = 'desc' | 'asc'

const FILTER_OPTIONS: { value: FilterKind; labelKey: string }[] = [
  { value: 'ALL', labelKey: 'filters.ALL' },
  { value: 'EARN', labelKey: 'filters.EARN' },
  { value: 'USE', labelKey: 'filters.USE' },
]

// ── BalanceBlock ───────────────────────────────────────────
function BalanceBlock({ balance, isLoading }: { balance: number | null; isLoading: boolean }) {
  const t = useTranslations('mypage.mileage')
  const locale = useLocale()
  const formatted = isLoading || balance === null ? '—' : balance.toLocaleString(locale)

  return (
    <section className="px-1">
      <h2 className="text-sm font-medium text-tag-text">{t('balanceLabel')}</h2>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums">{formatted}</span>
        <span className="text-base font-semibold text-tag-text">{t('unit')}</span>
      </p>
    </section>
  )
}

// ── EarnSection ────────────────────────────────────────────
function EarnSection() {
  const t = useTranslations('mypage.mileage')
  const methods = t.raw('earnMethods') as Array<{ title: string; desc: string }>
  const [open, setOpen] = useState(false)

  return (
    <section className="rounded-card bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full min-h-[52px] items-center justify-between px-4 text-left"
      >
        <span className="text-sm font-semibold text-foreground">{t('howToEarnTitle')}</span>
        <ChevronDown
          size={16}
          className={`text-tag-text transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul className="border-t border-tag-bg px-4 py-1">
          {methods.map((method) => (
            <li key={method.title} className="py-3 [&+&]:border-t [&+&]:border-tag-bg">
              <p className="text-sm font-semibold text-foreground">{method.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-tag-text whitespace-pre-line">{method.desc}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ── LogRow ─────────────────────────────────────────────────
function LogRow({ item }: { item: MileageHistoryItem }) {
  const t = useTranslations('mypage.mileage')
  const locale = useLocale()
  const isEarn = item.amount > 0
  const label = getTypeLabel(item.type, item.amount, t)
  const sign = isEarn ? '+' : '−'
  const formattedAmount = `${sign}${Math.abs(item.amount).toLocaleString(locale)}`
  const formattedDate = dayjs(item.createdAt).format('YYYY.MM.DD')
  const formattedBalance = item.balanceAfter.toLocaleString(locale)
  const subText =
    item.type === 'ADMIN_ADJUST' && item.adjustReason
      ? item.adjustReason
      : t('balance', { balance: formattedBalance })

  return (
    <li className="flex items-center justify-between gap-4 py-3.5 [&+&]:border-t [&+&]:border-tag-bg">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 truncate text-xs text-tag-text">
          {formattedDate} · {subText}
        </p>
      </div>
      <span
        className={`shrink-0 text-base font-bold tabular-nums ${isEarn ? 'text-mileage-earn' : 'text-foreground'}`}
      >
        {formattedAmount}
      </span>
    </li>
  )
}

// ── EmptyState ─────────────────────────────────────────────
function EmptyState({ filter }: { filter: FilterKind }) {
  const t = useTranslations('mypage.mileage')
  const router = useRouter()
  const copy = t.raw(`empty.${filter}`) as { head: string; body: string }

  return (
    <div className="py-10 text-center">
      <p className="text-sm font-semibold text-foreground">{copy.head}</p>
      <p className="mt-1 text-sm leading-relaxed text-tag-text whitespace-pre-line">{copy.body}</p>
      <Button variant="outlined" size="sm" className="mt-4" onClick={() => router.push('/gatherings')}>
        {t('browseGatherings')}
      </Button>
    </div>
  )
}

// ── LogSection ─────────────────────────────────────────────
function LogSection({ enabled }: { enabled: boolean }) {
  const t = useTranslations('mypage.mileage')
  const tCommon = useTranslations('common')
  const [filter, setFilter] = useState<FilterKind>('ALL')
  const [sort, setSort] = useState<SortOrder>('desc')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useMyMileageHistory(page, 20, enabled)

  const filteredItems = useMemo(() => {
    if (!data?.content) return []
    let items = [...data.content]
    if (filter === 'EARN') items = items.filter((i) => i.amount > 0)
    if (filter === 'USE') items = items.filter((i) => i.amount < 0)
    if (sort === 'asc') items.reverse()
    return items
  }, [data, filter, sort])

  const totalPages = data?.totalPages ?? 0

  const handleFilterChange = (f: FilterKind) => {
    setFilter(f)
    setPage(0)
  }

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="text-base font-bold text-foreground">{t('logTitle')}</h2>
        {filteredItems.length > 0 && (
          <span className="text-xs text-tag-text tabular-nums">
            {t('itemCount', { count: filteredItems.length })}
          </span>
        )}
      </div>

      {/* 필터(전체/적립/사용) + 정렬 */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={filter === opt.value}
              onClick={() => handleFilterChange(opt.value)}
              className={`min-h-[36px] rounded-full px-3.5 text-sm font-medium transition-colors ${
                filter === opt.value ? 'bg-foreground text-background' : 'bg-card text-tag-text'
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
          className="inline-flex min-h-[36px] items-center gap-1 px-2 text-sm text-tag-text"
        >
          <ArrowDownUp size={14} />
          {sort === 'desc' ? t('sortLatest') : t('sortOldest')}
        </button>
      </div>

      <div className="rounded-card bg-card px-4">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-tag-text">{tCommon('loading')}</p>
        ) : filteredItems.length > 0 ? (
          <ul>
            {filteredItems.map((item) => (
              <LogRow key={item.id} item={item} />
            ))}
          </ul>
        ) : (
          <EmptyState filter={filter} />
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
            {tCommon('previous')}
          </Button>
          <span className="text-sm text-tag-text tabular-nums">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
          >
            {tCommon('next')}
          </Button>
        </div>
      )}
    </section>
  )
}

// ── MileagePage ────────────────────────────────────────────
export default function MileagePage() {
  const tCommon = useTranslations('common')
  const router = useRouter()
  const { isLoggedIn, isInitialized } = useRequireAuth()
  const enabled = isLoggedIn && isInitialized

  const { data: balanceData, isLoading: balanceLoading } = useMyMileageBalance(enabled)

  useEffect(() => {
    if (isInitialized && !isLoggedIn) {
      router.replace('/login?returnUrl=/mypage/mileage')
    }
  }, [isInitialized, isLoggedIn, router])

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-tag-text">{tCommon('loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-6 pb-24 flex flex-col gap-6">
        <BalanceBlock
          balance={balanceData?.mileage ?? null}
          isLoading={balanceLoading}
        />
        <EarnSection />
        <LogSection enabled={enabled} />
      </div>
    </div>
  )
}
