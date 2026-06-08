'use client'

import { X } from 'lucide-react'
import { useAdminApplicationDetail } from '@/lib/hooks/useMatching'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type { AnswerView } from '@/lib/api/types'

interface ApplicationAnswersModalProps {
  applicationId: string | null
  onClose: () => void
}

function formatValue(value: AnswerView['value']): string {
  if (value === null || value === undefined) return '-'
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '-'
  return String(value)
}

export default function ApplicationAnswersModal({ applicationId, onClose }: ApplicationAnswersModalProps) {
  const { data, isLoading } = useAdminApplicationDetail(applicationId)

  if (!applicationId) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[16px] w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-[#F0EBE8] flex items-center justify-between">
          <h3 className="font-bold text-[16px] text-[#1A1A1A]">신청서</h3>
          <button onClick={onClose} className="text-[#767676] hover:text-[#1A1A1A]">
            <X size={20} />
          </button>
        </div>

        {/* 본문 */}
        <div className="overflow-y-auto px-5 py-4">
          {isLoading || !data ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* 기본 정보 */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[15px] text-[#1A1A1A]">{data.name ?? '-'}</span>
                  <span className="text-[13px] text-[#767676]">{data.phone ?? '-'}</span>
                </div>
                <span className="text-[12px] text-[#999]">예약번호 {data.bookingNumber}</span>
              </div>

              {/* 답변 목록 */}
              <div className="flex flex-col divide-y divide-[#F0EBE8] border-t border-[#F0EBE8]">
                {data.answers.length === 0 ? (
                  <p className="text-[13px] text-[#767676] py-4">작성된 답변이 없습니다.</p>
                ) : (
                  data.answers.map((a) => (
                    <div key={a.questionKey} className="py-3">
                      <p className="text-[12px] text-[#767676] mb-1">{a.label}</p>
                      <p className="text-[14px] text-[#1A1A1A]">{formatValue(a.value)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
