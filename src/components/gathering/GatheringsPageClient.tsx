'use client'

import { useState } from 'react'
import dayjs from 'dayjs'
import CalendarView from '@/components/gathering/CalendarView'
import GatheringList from '@/components/gathering/GatheringList'
import ViewToggle from '@/components/gathering/ViewToggle'
import GatheringTypeCardView from '@/components/gathering/GatheringTypeCardView'
import { useGatherings, useCalendarDots } from '@/lib/hooks/useGatherings'

export default function GatheringsPageClient() {
  const today = dayjs()
  const [view, setView] = useState<'calendar' | 'card'>('calendar')
  const [selectedDate, setSelectedDate] = useState(today.format('YYYY-MM-DD'))
  const [currentYear, setCurrentYear] = useState(today.year())
  const [currentMonth, setCurrentMonth] = useState(today.month() + 1)

  const { data: gatherings, isLoading, isError, refetch } = useGatherings(selectedDate)
  const { data: calendarDots = [] } = useCalendarDots(currentYear, currentMonth)

  const handleChangeMonth = (year: number, month: number) => {
    setCurrentYear(year)
    setCurrentMonth(month)
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="pt-4">
        <ViewToggle view={view} onChange={setView} />
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
