'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight, Users, MapPin, Clock } from 'lucide-react'
import { adminGatheringApi, type AdminGatheringListItem } from '@/lib/api/adminGathering'
import { useCalendarDots } from '@/lib/hooks/useGatherings'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

const STATUS_LABEL: Record<string, string> = {
  RECRUITING: '모집중', OPEN: '모집중', CLOSED: '마감', COMPLETED: '진행완료', CANCELLED: '취소',
}
const STATUS_STYLE: Record<string, string> = {
  RECRUITING: 'bg-[#FDECEA] text-[#C8392B]', OPEN: 'bg-[#FDECEA] text-[#C8392B]',
  CLOSED: 'bg-[#F5F5F5] text-[#767676]', COMPLETED: 'bg-[#E8F5E9] text-[#4CAF50]',
  CANCELLED: 'bg-[#FEF3F3] text-red-400',
}

interface MiniCalendarProps {
  year: number
  month: number
  selectedDate: string
  dotDates: string[]
  onSelectDate: (date: string) => void
  onChangeMonth: (year: number, month: number) => void
}

function MiniCalendar({ year, month, selectedDate, dotDates, onSelectDate, onChangeMonth }: MiniCalendarProps) {
  const firstDay = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
  const startDayOfWeek = firstDay.day()
  const daysInMonth = firstDay.daysInMonth()
  const today = dayjs().format('YYYY-MM-DD')

  const cells: (number | null)[] = [
    ...Array(startDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] p-5 shrink-0 w-full max-w-[360px] lg:w-[320px]">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => { const d = firstDay.subtract(1, 'month'); onChangeMonth(d.year(), d.month() + 1) }}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F0EB] transition-colors"
        >
          <ChevronLeft size={18} className="text-[#767676]" />
        </button>
        <span className="font-bold text-[15px] text-[#1A1A1A]">{year}년 {month}월</span>
        <button
          onClick={() => { const d = firstDay.add(1, 'month'); onChangeMonth(d.year(), d.month() + 1) }}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F0EB] transition-colors"
        >
          <ChevronRight size={18} className="text-[#767676]" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div key={d} className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-[#C8392B]' : 'text-[#767676]'}`}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="h-10" />
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === today
          const hasDot = dotDates.includes(dateStr)
          const isSunday = idx % 7 === 0
          return (
            <button key={dateStr} onClick={() => onSelectDate(dateStr)} className="flex flex-col items-center py-1 gap-0.5 h-10 justify-center">
              <span
                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors
                  ${isSelected ? 'bg-[#C8392B] text-white font-semibold' : ''}
                  ${!isSelected && isToday ? 'text-[#C8392B] font-semibold' : ''}
                  ${!isSelected && !isToday && isSunday ? 'text-[#C8392B]' : ''}
                  ${!isSelected && !isToday && !isSunday ? 'text-[#1A1A1A] hover:bg-[#F5F0EB]' : ''}`}
              >
                {day}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${hasDot ? (isSelected ? 'bg-white' : 'bg-[#C8392B]') : 'bg-transparent'}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface GatheringCardProps {
  gathering: AdminGatheringListItem
  isSelected: boolean
  onClick: () => void
}

function GatheringCard({ gathering, isSelected, onClick }: GatheringCardProps) {
  const fillRate = gathering.capacity > 0 ? (gathering.currentApplicants / gathering.capacity) * 100 : 0
  return (
    <button
      onClick={onClick}
      className={`shrink-0 w-[220px] h-full text-left rounded-[16px] p-4 border-2 transition-all
        ${isSelected
          ? 'border-[#C8392B] bg-[#FDECEA] shadow-[0_4px_16px_rgba(200,57,43,0.2)]'
          : 'border-transparent bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:border-[#C8392B]/40'}`}
    >
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[gathering.status] ?? ''}`}>
        {STATUS_LABEL[gathering.status] ?? gathering.status}
      </span>
      <p className="font-bold text-[14px] text-[#1A1A1A] mt-2 mb-3 line-clamp-2 leading-snug">{gathering.title}</p>
      <div className="flex flex-col gap-1.5 text-xs text-[#767676]">
        <div className="flex items-center gap-1.5">
          <Clock size={12} />
          <span>{gathering.startTime?.slice(0, 5)} ~ {gathering.endTime?.slice(0, 5) ?? ''}</span>
        </div>
        {gathering.locationName && (
          <div className="flex items-center gap-1.5">
            <MapPin size={12} />
            <span className="truncate">{gathering.locationName}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Users size={12} />
          <span>{gathering.currentApplicants}/{gathering.capacity}명</span>
        </div>
      </div>
      <div className="mt-3 w-full h-1.5 bg-[#F0EBE8] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${isSelected ? 'bg-[#C8392B]' : 'bg-[#C8392B]/60'}`} style={{ width: `${Math.min(fillRate, 100)}%` }} />
      </div>
    </button>
  )
}

interface GatheringDateSelectorProps {
  selectedGatheringId: string
  onSelect: (gathering: AdminGatheringListItem | null) => void
}

export default function GatheringDateSelector({ selectedGatheringId, onSelect }: GatheringDateSelectorProps) {
  const today = dayjs()
  const [selectedDate, setSelectedDate] = useState(today.format('YYYY-MM-DD'))
  const [currentYear, setCurrentYear] = useState(today.year())
  const [currentMonth, setCurrentMonth] = useState(today.month() + 1)

  const { data: calendarDots = [] } = useCalendarDots(currentYear, currentMonth)
  const { data: dayGatherings = [], isLoading } = useQuery({
    queryKey: ['admin', 'gatherings-by-date', selectedDate],
    queryFn: () => adminGatheringApi.getAll(undefined, selectedDate),
  })

  const selectedDayjs = dayjs(selectedDate)

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <MiniCalendar
        year={currentYear}
        month={currentMonth}
        selectedDate={selectedDate}
        dotDates={calendarDots.map((d) => d.date)}
        onSelectDate={(date) => { setSelectedDate(date); onSelect(null) }}
        onChangeMonth={(y, m) => { setCurrentYear(y); setCurrentMonth(m) }}
      />

      <div className="w-full flex-1 min-w-0">
        <p className="text-sm font-bold text-[#1A1A1A] mb-3">
          {selectedDayjs.format('M월 D일')} 게더링
          {dayGatherings.length > 0 && <span className="ml-2 text-[#767676] font-normal">{dayGatherings.length}건</span>}
        </p>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center"><LoadingSpinner /></div>
        ) : dayGatherings.length === 0 ? (
          <div className="h-[200px] bg-white rounded-[16px] flex flex-col items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            <p className="text-[#767676] text-sm font-medium">이 날은 게더링이 없어요.</p>
            <p className="text-[#767676] text-xs mt-1">다른 날짜를 선택해주세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 h-[200px]">
              {dayGatherings.map((g) => (
                <GatheringCard
                  key={g.id}
                  gathering={g}
                  isSelected={selectedGatheringId === g.id}
                  onClick={() => onSelect(selectedGatheringId === g.id ? null : g)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
