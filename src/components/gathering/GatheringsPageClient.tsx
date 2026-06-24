'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dayjs from 'dayjs'
import CalendarView from '@/components/gathering/CalendarView'
import GatheringList from '@/components/gathering/GatheringList'
import ViewToggle from '@/components/gathering/ViewToggle'
import GatheringTypeCardView from '@/components/gathering/GatheringTypeCardView'
import { useGatherings, useCalendarDots } from '@/lib/hooks/useGatherings'

function GatheringsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const today = dayjs()

  // 뷰 상태를 URL(?view=card)에 유지해, 상세 진입 후 뒤로가기 시 모아보기가 복원되도록 한다. (KAN-295)
  const [view, setView] = useState<'calendar' | 'card'>(
    searchParams.get('view') === 'card' ? 'card' : 'calendar',
  )
  const [selectedDate, setSelectedDate] = useState(today.format('YYYY-MM-DD'))
  const [currentYear, setCurrentYear] = useState(today.year())
  const [currentMonth, setCurrentMonth] = useState(today.month() + 1)

  const { data: gatherings, isLoading, isError, refetch } = useGatherings(selectedDate)
  const { data: calendarDots = [] } = useCalendarDots(currentYear, currentMonth)

  const handleChangeMonth = (year: number, month: number) => {
    setCurrentYear(year)
    setCurrentMonth(month)
  }

  const handleViewChange = (next: 'calendar' | 'card') => {
    setView(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'card') {
      params.set('view', 'card')
    } else {
      params.delete('view')
    }
    const query = params.toString()
    router.replace(query ? `/gatherings?${query}` : '/gatherings', { scroll: false })
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="pt-4">
        <ViewToggle view={view} onChange={handleViewChange} />
      </div>

      {view === 'calendar' ? (
        <>
          <div className="pt-4 mb-5">
            <CalendarView
              year={currentYear}
              month={currentMonth}
              selectedDate={selectedDate}
              dots={calendarDots}
              onSelectDate={setSelectedDate}
              onChangeMonth={handleChangeMonth}
            />
          </div>
          <GatheringList
            date={selectedDate}
            gatherings={gatherings}
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
          />
        </>
      ) : (
        <div className="pt-4">
          <GatheringTypeCardView />
        </div>
      )}
    </div>
  )
}

export default function GatheringsPageClient() {
  return (
    <Suspense fallback={null}>
      <GatheringsContent />
    </Suspense>
  )
}
