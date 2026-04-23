'use client'

import { useState } from 'react'
import dayjs from 'dayjs'
import { Bell } from 'lucide-react'
import ViewToggle from '@/components/gathering/ViewToggle'
import CalendarView from '@/components/gathering/CalendarView'
import MapView from '@/components/gathering/MapView'
import GatheringList from '@/components/gathering/GatheringList'
import { useGatherings, useCalendarDots } from '@/lib/hooks/useGatherings'

type View = 'calendar' | 'map'

export default function MainHomePage() {
  const today = dayjs()
  const [view, setView] = useState<View>('calendar')
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
      <header className="flex items-center justify-between px-4 py-4">
        <h1 className="text-lg font-bold text-foreground">와썹하우스</h1>
        <button className="p-1 min-w-[44px] min-h-[44px] flex items-center justify-center">
          <Bell size={22} className="text-foreground" />
        </button>
      </header>

      <div className="mb-4">
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === 'calendar' ? (
        <>
          <div className="mb-5">
            <CalendarView
              year={currentYear}
              month={currentMonth}
              selectedDate={selectedDate}
              dotDates={calendarDots}
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
        <MapView
          gatherings={gatherings ?? []}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
        />
      )}
    </div>
  )
}
