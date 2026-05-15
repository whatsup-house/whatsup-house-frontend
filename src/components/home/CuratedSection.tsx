'use client'

import { useRouter } from 'next/navigation'
import { Flame } from 'lucide-react'
import { useCuratedGatherings } from '@/lib/hooks/useHome'

export default function CuratedSection() {
  const router = useRouter()
  const { data, isLoading } = useCuratedGatherings()
  const gatherings = data?.gatherings ?? []

  if (isLoading) {
    return (
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <Flame size={14} className="text-primary fill-primary" strokeWidth={0} />
          <span className="text-[15px] font-bold text-foreground">이번 주 가장 많이 본 게더링</span>
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 bg-card rounded-2xl p-2.5 border border-tag-bg/40 animate-pulse">
              <div className="w-7 h-7 bg-tag-bg rounded flex-shrink-0" />
              <div className="w-12 h-12 bg-tag-bg rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-tag-bg rounded w-3/4" />
                <div className="h-2.5 bg-tag-bg rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (gatherings.length === 0) return null

  return (
    <div className="px-4 pt-5 pb-2">
      <div className="flex items-center gap-2 mb-3">
        <Flame size={14} className="text-primary fill-primary" strokeWidth={0} />
        <span className="text-[15px] font-bold text-foreground">이번 주 가장 많이 본 게더링</span>
      </div>
      <div className="flex flex-col gap-3">
        {gatherings.map((item) => (
          <button
            key={item.id}
            type="button"
            className="flex items-center gap-3 bg-card rounded-2xl p-2.5 border border-tag-bg/40 text-left w-full"
            onClick={() => router.push(`/gatherings/${item.id}`)}
          >
            <span
              className={`w-7 text-center text-lg font-bold flex-shrink-0 ${
                item.rank === 1 ? 'text-primary' : 'text-tag-text'
              }`}
            >
              {item.rank}
            </span>
            <div className="relative w-12 h-12 flex-shrink-0 bg-tag-bg rounded-xl overflow-hidden">
              {item.thumbnailUrl && (
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
              <p className="text-[11px] text-tag-text/70 mt-0.5">
                {[item.date, item.locationName].filter(Boolean).join(' · ')}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
