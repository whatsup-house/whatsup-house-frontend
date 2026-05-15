'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import dayjs from 'dayjs'
import { useGatheringsByTitle } from '@/lib/hooks/useGatherings'
import type { GatheringListItem } from '@/lib/api/types'

interface GatheringDateSheetProps {
  title: string
  currentGatheringId: string
  currentEventDate: string
  isOpen: boolean
  onClose: () => void
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

export default function GatheringDateSheet({
  title,
  currentGatheringId,
  currentEventDate,
  isOpen,
  onClose,
}: GatheringDateSheetProps) {
  const router = useRouter()
  const [viewDate, setViewDate] = useState(() => dayjs(currentEventDate))
  const { data: gatherings = [] } = useGatheringsByTitle(title)

  const year = viewDate.year()
  const month = viewDate.month()

  const dateMap = new Map<string, GatheringListItem>()
  gatherings.forEach((g) => {
    dateMap.set(g.eventDate, g)
  })

  const firstDay = viewDate.startOf('month')
  const startOffset = firstDay.day()
  const daysInMonth = viewDate.daysInMonth()

  const cells: Array<{ day: number; dateStr: string } | null> = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      return { day, dateStr: viewDate.date(day).format('YYYY-MM-DD') }
    }),
  ]

  const handleDayClick = (dateStr: string) => {
    const g = dateMap.get(dateStr)
    if (!g) return
    onClose()
    router.push(`/gatherings/${g.id}`)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-[390px] bg-card rounded-t-2xl overflow-hidden animate-slide-up"
        style={{ maxHeight: '60vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-tag-bg rounded-full" />
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-tag-text"
          aria-label="닫기"
        >
          <X size={18} />
        </button>

        {/* 월 이동 헤더 */}
        <div className="flex items-center justify-between px-5 py-2">
          <button
            onClick={() => setViewDate((d) => d.subtract(1, 'month'))}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-tag-text"
            aria-label="이전 달"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-base font-bold text-foreground">
            {year}년 {month + 1}월
          </span>
          <button
            onClick={() => setViewDate((d) => d.add(1, 'month'))}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-tag-text"
            aria-label="다음 달"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 px-3">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-tag-text py-1.5">
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 px-3 pb-8 overflow-y-auto">
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} className="min-h-[44px]" />

            const g = dateMap.get(cell.dateStr)
            const isCurrent = cell.dateStr === currentEventDate
            const isHighlighted = !!g

            let circleClass = 'text-tag-text/40'
            if (isHighlighted) {
              if (isCurrent) {
                circleClass = 'bg-primary-light text-primary ring-2 ring-primary'
              } else if (g?.status === 'OPEN') {
                circleClass = 'bg-primary text-white'
              } else {
                circleClass = 'bg-tag-bg text-tag-text'
              }
            }

            return (
              <button
                key={cell.dateStr}
                onClick={() => isHighlighted && handleDayClick(cell.dateStr)}
                disabled={!isHighlighted}
                className="flex flex-col items-center justify-center min-h-[44px] gap-0.5 disabled:pointer-events-none"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${circleClass}`}>
                  {cell.day}
                </div>
                {isCurrent && (
                  <span className="text-[9px] font-bold text-primary leading-none">현재</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
