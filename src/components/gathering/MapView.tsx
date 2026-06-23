import { MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import GatheringCard from './GatheringCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ApiErrorMessage from '@/components/ui/ApiErrorMessage'
import type { GatheringListItem } from '@/lib/api/types'

interface MapViewProps {
  gatherings: GatheringListItem[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

export default function MapView({ gatherings, isLoading, isError, onRetry }: MapViewProps) {
  const t = useTranslations('gathering.map')

  return (
    <div>
      {/* 지도 영역 (추후 Kakao Maps 연동 예정) */}
      <div className="h-52 mx-4 rounded-card bg-tag-bg flex flex-col items-center justify-center gap-2 mb-4">
        <MapPin size={32} className="text-tag-text opacity-40" />
        <span className="text-sm text-tag-text opacity-60">{t('comingSoon')}</span>
      </div>

      {/* 주변 게더링 목록 */}
      <div className="px-4">
        {isLoading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        )}
        {isError && <ApiErrorMessage onRetry={onRetry} />}
        {!isLoading && !isError && (
          <>
            {gatherings.length > 0 && (
              <p className="text-sm font-semibold text-foreground mb-3">
                {t('nearbyCount', { count: gatherings.length })}
              </p>
            )}
            <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4">
              {gatherings.map((g) => (
                <div key={g.id} className="min-w-[260px]">
                  <GatheringCard gathering={g} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
