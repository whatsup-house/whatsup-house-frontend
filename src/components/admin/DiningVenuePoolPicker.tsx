'use client'

import { useDiningVenues } from '@/lib/hooks/useAdminDiningOps'

interface DiningVenuePoolPickerProps {
  // venueId → 수용 테이블 수
  pool: Record<string, number>
  onChange: (pool: Record<string, number>) => void
}

// 회차 식당 풀 고르기: 활성 식당 체크 + 수용 테이블 수. 회차 만들기 모달(KAN-351)과 회차 콘솔(KAN-352)이 함께 쓴다.
export default function DiningVenuePoolPicker({ pool, onChange }: DiningVenuePoolPickerProps) {
  const { data: venues } = useDiningVenues()
  const activeVenues = (venues ?? []).filter((venue) => venue.isActive)

  const toggle = (venueId: string, checked: boolean) => {
    const next = { ...pool }
    if (checked) next[venueId] = 1
    else delete next[venueId]
    onChange(next)
  }

  // BE 범위 1~100
  const setCapacity = (venueId: string, value: string) =>
    onChange({ ...pool, [venueId]: Math.min(100, Math.max(1, Math.trunc(Number(value)) || 1)) })

  if (!venues) return <p className="text-xs text-tag-text">식당을 불러오는 중…</p>
  if (activeVenues.length === 0) return <p className="text-xs text-tag-text">등록된 활성 식당이 없어요.</p>
  return (
    <ul className="flex flex-col gap-2">
      {activeVenues.map((venue) => {
        const capacity = pool[venue.id]
        return (
          <li key={venue.id} className="flex items-center gap-2 min-h-9">
            <label className="flex flex-1 min-w-0 items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 accent-primary"
                checked={capacity !== undefined}
                onChange={(e) => toggle(venue.id, e.target.checked)}
              />
              <span className="truncate">{venue.name}</span>
              <span className="shrink-0 text-xs text-tag-text">{venue.region}</span>
            </label>
            {capacity !== undefined && (
              <label className="flex shrink-0 items-center gap-1 text-xs text-tag-text">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={capacity}
                  onChange={(e) => setCapacity(venue.id, e.target.value)}
                  aria-label={`${venue.name} 수용 테이블 수`}
                  className="w-16 h-9 px-2 border border-tag-bg rounded-input text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                />
                테이블
              </label>
            )}
          </li>
        )
      })}
    </ul>
  )
}
