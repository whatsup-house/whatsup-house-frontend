'use client'

import { useState } from 'react'
import GatheringDateSelector from '@/components/admin/GatheringDateSelector'
import FormQuestionBuilder from '@/components/admin/FormQuestionBuilder'
import type { AdminGatheringListItem } from '@/lib/api/adminGathering'

export default function AdminFormsPage() {
  const [selected, setSelected] = useState<AdminGatheringListItem | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-bold text-[22px] text-foreground">신청폼 관리</h1>
      </div>

      <div className="mb-6">
        <GatheringDateSelector selectedGatheringId={selected?.id ?? ''} onSelect={setSelected} />
      </div>

      {selected ? (
        <FormQuestionBuilder gatheringId={selected.id} gatheringTitle={selected.title} />
      ) : (
        <div className="bg-white rounded-[12px] p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <p className="text-base font-medium text-[#1A1A1A] mb-1">게더링을 선택해주세요</p>
          <p className="text-sm text-[#767676]">
            날짜와 게더링을 고르면 신청폼 질문을 추가·수정할 수 있어요. 우연한 식탁은 매칭 질문(나이·성별·관심사 등)을 넣어주세요.
          </p>
        </div>
      )}
    </div>
  )
}
