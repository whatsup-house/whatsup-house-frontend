import { Coffee } from 'lucide-react'
import dayjs from 'dayjs'
import GatheringCard from './GatheringCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ApiErrorMessage from '@/components/ui/ApiErrorMessage'
import EmptyState from '@/components/ui/EmptyState'
import type { GatheringListItem } from '@/lib/api/types'

interface GatheringListProps {
  date: string
  gatherings: GatheringListItem[] | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

export default function GatheringList({ date, gatherings, isLoading, isError, onRetry }: GatheringListProps) {
  const d = dayjs(date)

  return (
    <div className="px-4">
      <h2 className="text-base font-semibold text-foreground mb-3">
        {d.month() + 1}월 {d.date()}일 열리는 게더링
      </h2>

      {isLoading && (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      )}

      {isError && <ApiErrorMessage onRetry={onRetry} />}

      {!isLoading && !isError && gatherings?.length === 0 && (
        <div className="border border-dashed border-tag-bg rounded-card">
          <EmptyState
            icon={Coffee}
            title="이 날은 게더링이 없어요."
            description="다른 날을 골라보세요 :)"
          />
        </div>
      )}

      {!isLoading && !isError && gatherings && gatherings.length > 0 && (
        <div className="flex flex-col gap-4">
          {gatherings.map((gathering) => (
            <GatheringCard key={gathering.id} gathering={gathering} />
          ))}
        </div>
      )}
    </div>
  )
}
