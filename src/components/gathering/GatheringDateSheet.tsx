'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import dayjs from 'dayjs'
import { useLocale, useTranslations } from 'next-intl'
import type { GatheringSession } from '@/lib/api/types'
import { formatLocalizedShortDate, formatTimeRange } from '@/lib/utils/date'
import { isSessionApplicable } from '@/lib/utils/gatheringStatus'

interface GatheringDateSheetProps {
  // 종류의 전체 회차 (지난 회차 포함, 날짜순)
  sessions: GatheringSession[]
  currentSessionId: string | null
  onSelect: (sessionId: string) => void
  onClose: () => void
}

// 게더링 상세의 회차 달력 바텀시트. 신청 가능한 날만 고를 수 있다. (KAN-386, 옛 KAN-253 시트를 회차 기준으로)
// 부모가 열 때만 마운트한다 → 열 때마다 처음 달을 다시 정한다.
export default function GatheringDateSheet({ sessions, currentSessionId, onSelect, onClose }: GatheringDateSheetProps) {
  const t = useTranslations('gathering.calendar')
  const tDetail = useTranslations('gathering.detail')
  const locale = useLocale()
  const dayNames = t.raw('dayLabels') as string[]
  const currentDate = sessions.find((session) => session.id === currentSessionId)?.eventDate
  // 처음 열 달: 보고 있는 회차의 달. 그 달에 신청 가능한 날이 없으면(지난 회차로 들어온 경우 등) 가장 가까운 신청 가능 회차의 달
  const [viewMonth, setViewMonth] = useState(() => {
    const applicable = sessions.filter(isSessionApplicable)
    const start = applicable.some((session) => session.eventDate.slice(0, 7) === currentDate?.slice(0, 7))
      ? currentDate
      : applicable[0]?.eventDate ?? currentDate
    return dayjs(start ?? sessions[0]?.eventDate).startOf('month')
  })
  // 같은 날 신청 가능한 회차가 여러 개일 때 시간 칩을 보여줄 날짜
  const [chipDate, setChipDate] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // 포커스: 열리면 닫기 버튼으로, Tab은 시트 안에서만 돌고, 닫히면(회차 선택 포함) 연 버튼으로 되돌린다
  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    // preventScroll: 슬라이드 애니메이션 중엔 버튼이 프레임 아래에 있어, 그냥 focus하면 데스크탑 프레임(overflow-hidden)이 스크롤돼 시트가 밀린다
    closeButtonRef.current?.focus({ preventScroll: true })
    const handleTab = (e: KeyboardEvent) => {
      const dialog = dialogRef.current
      if (e.key !== 'Tab' || !dialog) return
      const focusables = [...dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (!first) return
      const active = document.activeElement
      if (!dialog.contains(active) || (e.shiftKey && active === first) || (!e.shiftKey && active === last)) {
        e.preventDefault()
        const target = e.shiftKey ? last : first
        target.focus()
      }
    }
    document.addEventListener('keydown', handleTab)
    return () => {
      document.removeEventListener('keydown', handleTab)
      trigger?.focus({ preventScroll: true })
    }
  }, [])

  // ESC 닫기, body 스크롤 잠금(닫으면 복원)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const sessionsByDate = new Map<string, GatheringSession[]>()
  sessions.forEach((session) => {
    sessionsByDate.set(session.eventDate, [...(sessionsByDate.get(session.eventDate) ?? []), session])
  })
  const applicableOn = (date: string) => (sessionsByDate.get(date) ?? []).filter(isSessionApplicable)

  // 월 이동은 회차가 있는 달 범위 안에서만
  const sortedDates = [...sessionsByDate.keys()].sort()
  const canGoPrev = !!sortedDates[0] && viewMonth.isAfter(dayjs(sortedDates[0]), 'month')
  const canGoNext = !!sortedDates.length && viewMonth.isBefore(dayjs(sortedDates[sortedDates.length - 1]), 'month')
  const changeMonth = (diff: number) => {
    setViewMonth((month) => month.add(diff, 'month'))
    setChipDate(null)
  }

  const cells: Array<string | null> = [
    ...Array.from({ length: viewMonth.day() }, () => null),
    ...Array.from({ length: viewMonth.daysInMonth() }, (_, i) => viewMonth.date(i + 1).format('YYYY-MM-DD')),
  ]

  const handleDayClick = (date: string) => {
    const applicable = applicableOn(date)
    if (applicable.length === 1) onSelect(applicable[0].id)
    else setChipDate(date)
  }

  const chipSessions = chipDate ? applicableOn(chipDate) : []

  return (
    <div className="fixed lg:absolute inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={tDetail('viewOtherDate')}
        className="relative w-full md:max-w-[430px] max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card pb-[max(env(safe-area-inset-bottom),16px)] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-tag-bg" />
        </div>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-tag-text"
          aria-label={t('close')}
        >
          <X size={18} />
        </button>

        {/* 월 이동 헤더 */}
        <div className="flex items-center justify-center gap-4 px-5 pt-3 pb-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            disabled={!canGoPrev}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-tag-text disabled:opacity-30"
            aria-label={t('previousMonth')}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-base font-bold text-foreground">
            {t('monthTitle', { year: viewMonth.year(), month: viewMonth.month() + 1 })}
          </span>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            disabled={!canGoNext}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-tag-text disabled:opacity-30"
            aria-label={t('nextMonth')}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 px-3">
          {dayNames.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-tag-text py-1.5">
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 — 점: 신청 가능 = 초록(게더링 탭 달력과 같은 calendar-dot), 마감·진행완료·취소 = 회색 */}
        <div className="grid grid-cols-7 px-3">
          {cells.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="min-h-[48px]" />

            const daySessions = sessionsByDate.get(date)
            const isSelectable = applicableOn(date).length > 0
            const isCurrent = date === currentDate
            // 시간 칩을 펼친 날이 있으면 그 날을, 없으면 보고 있는 회차의 날을 채워 표시
            const isHighlighted = chipDate ? date === chipDate : isCurrent
            let circleClass = 'text-tag-text/40'
            if (isHighlighted) circleClass = 'bg-primary text-white font-semibold'
            else if (isSelectable) circleClass = 'text-foreground font-semibold'
            else if (daySessions) circleClass = 'text-tag-text'
            const dotClass = !daySessions ? 'bg-transparent' : isSelectable ? 'bg-calendar-dot' : 'bg-gray-300'

            return (
              <button
                key={date}
                type="button"
                onClick={() => handleDayClick(date)}
                disabled={!isSelectable}
                aria-pressed={isCurrent}
                className="flex flex-col items-center justify-center min-h-[48px] gap-0.5 disabled:cursor-default"
              >
                <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-colors ${circleClass}`}>
                  {dayjs(date).date()}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
              </button>
            )
          })}
        </div>

        {/* 같은 날 회차가 여러 개면 시간 칩으로 고른다 */}
        {chipDate && chipSessions.length > 0 && (
          <div className="border-t border-tag-bg mx-4 mt-2 pt-3">
            <p className="mb-2 text-xs text-tag-text">{formatLocalizedShortDate(chipDate, locale)}</p>
            <div className="flex flex-wrap gap-2">
              {chipSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => onSelect(session.id)}
                  aria-pressed={session.id === currentSessionId}
                  className={`min-h-[44px] rounded-full border px-4 text-sm font-medium ${
                    session.id === currentSessionId ? 'border-primary bg-primary-light text-primary' : 'border-tag-bg text-foreground'
                  }`}
                >
                  {formatTimeRange(session.startTime, session.endTime) || session.location?.name || formatLocalizedShortDate(session.eventDate, locale)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
