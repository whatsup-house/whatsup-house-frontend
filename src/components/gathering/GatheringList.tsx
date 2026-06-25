import { Coffee } from 'lucide-react'
import dayjs from 'dayjs'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('gathering.list')
  const d = dayjs(date)

  return (
    <div className="px-4">
      <h2 className="text-base font-semibold text-foreground mb-3">
        {t('dateTitle', { month: d.month() + 1, day: d.date() })}
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
            illustration="/NoGathering.png"
            title={t('emptyTitle')}
            description={t('emptyDescription')}
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
