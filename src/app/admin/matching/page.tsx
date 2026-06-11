'use client'

import { useState } from 'react'
import GatheringDateSelector from '@/components/admin/GatheringDateSelector'
import MatchingBoard from '@/components/admin/MatchingBoard'
import type { AdminGatheringListItem } from '@/lib/api/adminGathering'

export default function AdminMatchingPage() {
  const [selected, setSelected] = useState<AdminGatheringListItem | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-bold text-[22px] text-foreground">우연한 식탁 매칭</h1>
      </div>

      <div className="mb-6">
        <GatheringDateSelector
          selectedGatheringId={selected?.id ?? ''}
          onSelect={setSelected}
        />
      </div>

      {selected ? (
        <MatchingBoard gatheringId={selected.id} gatheringTitle={selected.title} />
      ) : (
        <div className="bg-white rounded-[12px] p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <p className="text-base font-medium text-[#1A1A1A] mb-1">게더링을 선택해주세요</p>
          <p className="text-sm text-[#767676]">
            위 캘린더에서 날짜를 고르고 게더링 카드를 클릭하면, 우연한 식탁 자동매칭을 실행하고 결과를 검토할 수 있어요.
          </p>
        </div>
      )}
    </div>
  )
}
