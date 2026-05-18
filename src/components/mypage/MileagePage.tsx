'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Gift, Users, Pencil, ImagePlus, Settings2,
  ChevronRight, ChevronDown, ArrowDownUp, Check, Coins,
} from 'lucide-react'
import dayjs from 'dayjs'
import { useMyMileageBalance, useMyMileageHistory } from '@/lib/hooks/useMileage'
import { useRequireAuth } from '@/lib/hooks/useRequireAuth'
import type { MileageHistoryItem, MileageType } from '@/lib/api/types'

// ── 타입 메타 ──────────────────────────────────────────────
const TYPE_ICON: Record<MileageType, React.ElementType> = {
  SIGNUP: Gift,
  ATTENDANCE: Users,
  REVIEW_REWARD: Pencil,
  REVIEW_UPGRADE: ImagePlus,
  ADMIN_ADJUST: Settings2,
}

function getTypeLabel(type: MileageType, amount: number): string {
  if (type === 'ADMIN_ADJUST') return amount > 0 ? '관리자 지급' : '관리자 차감'
  const LABELS: Record<MileageType, string> = {
    SIGNUP: '회원가입 환영',
    ATTENDANCE: '게더링 참석',
    REVIEW_REWARD: '게더링 후기 작성',
    REVIEW_UPGRADE: '후기 사진 업그레이드',
    ADMIN_ADJUST: '관리자 조정',
  }
  return LABELS[type]
}

// ── 적립 방법 ──────────────────────────────────────────────
const EARN_METHODS = [
  {
    num: '01',
    Icon: Users,
    title: '게더링 참석 완료',
    desc: '신청한 게더링에 참석하고\n주최자가 출석을 처리하면 쌓여요',
  },
  {
    num: '02',
    Icon: Pencil,
    title: '게더링 후기 작성',
    desc: '참석한 모임의 분위기와 감상을\n글이나 사진으로 남겨주세요',
  },
  {
    num: '03',
    Icon: Gift,
    title: '회원가입 환영 마일리지',
    desc: '와썹하우스에 처음 오신 분께\n인사 대신 드려요',
  },
]

type FilterKind = 'ALL' | 'EARN' | 'USE'
type SortOrder = 'desc' | 'asc'

const FILTER_OPTIONS: { value: FilterKind; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'EARN', label: '적립 내역' },
  { value: 'USE', label: '사용 내역' },
]

// ── BalanceBlock ───────────────────────────────────────────
function BalanceBlock({ balance, isLoading }: { balance: number | null; isLoading: boolean }) {
  const now = dayjs().format('YYYY.MM.DD HH:mm')
  const formatted = isLoading
    ? '—'
    : balance === null
    ? '— M'
    : balance.toLocaleString('ko-KR')

  return (
    <div className="px-1">
      <p className="text-xs font-medium text-tag-text mb-1.5">{now} 기준 보유 마일리지</p>
      <div className="flex items-baseline gap-2">
        <span className="text-6xl font-bold tracking-tight text-foreground tabular-nums leading-none">
          {formatted}
        </span>
        <span className="text-base font-semibold text-tag-text whitespace-nowrap">마일리지</span>
      </div>
    </div>
  )
}

// ── EarnSection ────────────────────────────────────────────
function EarnSection() {
  const [open, setOpen] = useState(false)

  return (
    <section>
      <div className="bg-card rounded-card border border-tag-bg/40 shadow-sm overflow-hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="w-full flex items-center justify-between px-4 py-4 text-left"
        >
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-primary mb-1">
              HOW TO EARN
            </p>
            <p className="text-base font-bold text-foreground">어떻게 쌓나요?</p>
          </div>
          <div
            className={`w-7 h-7 rounded-full bg-tag-bg flex items-center justify-center shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          >
            <ChevronRight size={14} className="text-tag-text" />
          </div>
        </button>

        {open && (
          <div className="pb-2">
            {EARN_METHODS.map((m) => (
              <div
                key={m.num}
                className="flex gap-3.5 px-4 py-4 border-t border-tag-bg/40"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                  <m.Icon size={20} className="text-primary" />
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[11px] font-bold text-primary tracking-wider tabular-nums">
                      {m.num}
                    </span>
                    <span className="text-[15px] font-bold text-foreground">{m.title}</span>
                  </div>
                  <p className="text-[12.5px] text-tag-text leading-relaxed whitespace-pre-line">
                    {m.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ── LogRow ─────────────────────────────────────────────────
function LogRow({ item, isFirst }: { item: MileageHistoryItem; isFirst: boolean }) {
  const Icon = TYPE_ICON[item.type]
  const isEarn = item.amount > 0
  const label = getTypeLabel(item.type, item.amount)
  const sign = isEarn ? '+' : '−'
  const formattedAmount = `${sign}${Math.abs(item.amount).toLocaleString('ko-KR')}`
  const formattedDate = dayjs(item.createdAt).format('YYYY.MM.DD')
  const formattedBalance = item.balanceAfter.toLocaleString('ko-KR')
  const subText =
    item.type === 'ADMIN_ADJUST' && item.adjustReason
      ? item.adjustReason
      : `잔액 ${formattedBalance}M`

  return (
    <div
      className={`flex items-center gap-3.5 px-4 py-3.5 ${!isFirst ? 'border-t border-tag-bg/40' : ''}`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isEarn ? 'bg-primary-light' : 'bg-tag-bg'
        }`}
      >
        <Icon size={20} className={isEarn ? 'text-primary' : 'text-tag-text'} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3 mb-0.5">
          <span className="text-sm font-bold text-foreground truncate">{label}</span>
          <span
            className={`text-base font-bold tabular-nums shrink-0 ${
              isEarn ? 'text-mileage-earn' : 'text-primary'
            }`}
          >
            {formattedAmount}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-tag-text min-w-0">
          <span className="truncate min-w-0">{subText}</span>
          <span className="shrink-0 text-tag-text/50">·</span>
          <span className="shrink-0">{formattedDate}</span>
        </div>
      </div>
    </div>
  )
}

// ── EmptyState ─────────────────────────────────────────────
function EmptyState({ filter }: { filter: FilterKind }) {
  const router = useRouter()
  const copy =
    filter === 'USE'
      ? { head: '아직 사용 내역이 없어요', body: '모은 마일리지로 게더링 참가비를\n할인받을 수 있어요' }
      : filter === 'EARN'
      ? { head: '아직 적립 내역이 없어요', body: '마음 가는 게더링에 신청하고\n오프라인에서 만나보세요' }
      : { head: '아직 마일리지 내역이 없어요', body: '게더링에 참석하거나 후기를 남기면\n마일리지가 쌓여요' }

  return (
    <div className="flex flex-col items-center py-8 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-tag-bg/60 flex items-center justify-center mb-3">
        <Coins size={24} className="text-tag-text/50" />
      </div>
      <p className="text-sm font-bold text-tag-text mb-1">{copy.head}</p>
      <p className="text-xs text-tag-text leading-relaxed whitespace-pre-line mb-4">{copy.body}</p>
      <button
        onClick={() => router.push('/gatherings')}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-full text-[13px] font-bold"
      >
        게더링 둘러보기 <ChevronRight size={14} />
      </button>
    </div>
  )
}

// ── LogSection ─────────────────────────────────────────────
function LogSection({ enabled }: { enabled: boolean }) {
  const [filter, setFilter] = useState<FilterKind>('ALL')
  const [sort, setSort] = useState<SortOrder>('desc')
  const [page, setPage] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

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
    setFilterOpen(false)
  }

  useEffect(() => {
    if (!filterOpen) return
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

  const currentLabel = FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? '전체'

  return (
    <section>
      {/* 섹션 헤더 */}
      <div className="flex items-end justify-between px-1 mb-2.5">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-primary mb-1">
            MILEAGE LOG
          </p>
          <p className="text-lg font-bold text-foreground">마일리지 내역</p>
        </div>
        {filteredItems.length > 0 && (
          <span className="text-[11px] font-bold text-tag-text tabular-nums">
            {filteredItems.length}건
          </span>
        )}
      </div>

      {/* 필터 + 정렬 컨트롤 */}
      <div className="flex items-center justify-between gap-2 px-1 mb-2.5">
        {/* 필터 드롭다운 */}
        <div ref={filterRef} className="relative">
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-card border border-tag-bg/40 rounded-full text-[13px] font-semibold text-foreground"
          >
            {currentLabel}
            <ChevronDown
              size={12}
              className={`text-tag-text transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {filterOpen && (
            <div className="absolute top-[calc(100%+6px)] left-0 min-w-[130px] bg-card border border-tag-bg/40 rounded-2xl shadow-lg overflow-hidden z-20">
              {FILTER_OPTIONS.map((opt, i) => (
                <button
                  key={opt.value}
                  onClick={() => handleFilterChange(opt.value)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] text-left ${
                    i > 0 ? 'border-t border-tag-bg/40' : ''
                  } ${
                    filter === opt.value
                      ? 'bg-primary-light font-bold text-primary'
                      : 'font-medium text-foreground'
                  }`}
                >
                  {opt.label}
                  {filter === opt.value && <Check size={14} className="text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 정렬 토글 */}
        <button
          onClick={() => setSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-tag-bg/40 rounded-full text-[13px] font-semibold text-tag-text"
        >
          <ArrowDownUp size={12} />
          {sort === 'desc' ? '최신순' : '오래된 순'}
        </button>
      </div>

      {/* 이력 목록 */}
      <div className="bg-card rounded-card border border-tag-bg/40 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-tag-text">불러오는 중...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item, i) => (
            <LogRow key={item.id} item={item} isFirst={i === 0} />
          ))
        ) : (
          <EmptyState filter={filter} />
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            className="px-4 py-2 rounded-full border border-tag-bg/40 text-[13px] font-semibold text-tag-text disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-[13px] font-medium text-tag-text tabular-nums">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 rounded-full border border-tag-bg/40 text-[13px] font-semibold text-tag-text disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </section>
  )
}

// ── MileagePage ────────────────────────────────────────────
export default function MileagePage() {
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
        <p className="text-sm text-tag-text">불러오는 중...</p>
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
