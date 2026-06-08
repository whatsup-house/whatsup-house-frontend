'use client'

import { useAdminUserDetail, useUpdateUserStatus } from '@/lib/hooks/useAdminUsers'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'
import dayjs from 'dayjs'

const GENDER_LABEL: Record<string, string> = { MALE: '남성', FEMALE: '여성', NONE: '선택 안함' }
const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-[#E8F5E9] text-[#4CAF50]',
  SUSPENDED: 'bg-[#FDECEA] text-[#C8392B]',
}
const STATUS_LABEL: Record<string, string> = { ACTIVE: '활성', SUSPENDED: '정지' }

interface UserDetailPanelProps {
  userId: string
  onClose: () => void
}

export function UserDetailPanel({ userId, onClose }: UserDetailPanelProps) {
  const { data: detail, isLoading } = useAdminUserDetail(userId)
  const { mutate: updateStatus, isPending } = useUpdateUserStatus(userId)

  const accountStatus = detail?.accountStatus ?? 'ACTIVE'
  const isSuspended = accountStatus === 'SUSPENDED'
  const isAdmin = detail?.admin ?? false

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 w-[440px] h-full bg-white shadow-2xl z-50 flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EBE8]">
          <h2 className="font-bold text-[18px]">회원 상세</h2>
          <button onClick={onClose} className="text-[#767676] text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading || !detail ? (
            <div className="flex justify-center py-16"><LoadingSpinner /></div>
          ) : (
            <>
              {/* 기본 정보 */}
              <div className="px-6 py-5 border-b border-[#F0EBE8]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-bold text-[18px] text-[#1A1A1A]">
                      {detail.nickname}
                      {detail.admin && <span className="ml-2 text-xs text-[#1976D2]">관리자</span>}
                    </p>
                    <p className="text-sm text-[#767676]">{detail.email}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[accountStatus]}`}>
                    {STATUS_LABEL[accountStatus]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['이름', detail.name ?? '미입력'],
                    ['연락처', detail.phone ?? '미입력'],
                    ['성별', GENDER_LABEL[detail.gender ?? ''] ?? detail.gender ?? '미입력'],
                    ['나이', detail.age ? `${detail.age}세` : '미입력'],
                    ['직업', detail.job ?? '미입력'],
                    ['MBTI', detail.mbti ?? '미입력'],
                    ['마일리지', `${detail.mileage.toLocaleString()}M`],
                    ['신청/출석', `${detail.totalApplications}건 / ${detail.attendedCount}`],
                    ['가입일', dayjs(detail.createdAt).format('YYYY.MM.DD')],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-[#767676] mb-0.5">{label}</p>
                      <p className="font-medium text-[#1A1A1A]">{value}</p>
                    </div>
                  ))}
                </div>

                {detail.intro && (
                  <div className="mt-3 px-3 py-2.5 bg-[#F5F0EB] rounded-[8px]">
                    <p className="text-xs text-[#767676] mb-1">자기소개</p>
                    <p className="text-sm text-[#1A1A1A]">{detail.intro}</p>
                  </div>
                )}
              </div>

              {/* 신청 이력 */}
              <div className="px-6 py-4">
                <h3 className="font-bold text-[14px] mb-3">신청 이력</h3>
                {detail.applicationHistory.length === 0 ? (
                  <p className="text-sm text-[#767676] py-4 text-center">신청 이력이 없습니다.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {detail.applicationHistory.map((app) => (
                      <div key={app.applicationId} className="flex items-center justify-between px-3 py-2.5 bg-[#F5F5F5] rounded-[8px]">
                        <div>
                          <p className="text-sm font-medium text-[#1A1A1A]">{app.gatheringTitle ?? '게더링'}</p>
                          <p className="text-xs text-[#767676]">{dayjs(app.createdAt).format('YYYY.MM.DD')}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          app.status === 'ATTENDED' ? 'bg-[#E8F5E9] text-[#4CAF50]' :
                          app.status === 'CANCELLED' ? 'bg-[#FDECEA] text-[#C8392B]' :
                          'bg-[#F5F5F5] text-[#767676]'
                        }`}>
                          {app.status === 'ATTENDED' ? '참석' :
                           app.status === 'CANCELLED' ? '취소' :
                           app.status === 'CONFIRMED' ? '확정' : '신청'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 푸터 - 상태 변경 (관리자 계정은 변경 불가) */}
        {!isAdmin ? (
          <div className="px-6 py-4 border-t border-[#F0EBE8] flex gap-3">
            <Button variant="ghost" type="button" onClick={onClose} className="flex-1">닫기</Button>
            <Button
              variant={isSuspended ? 'primary' : 'outlined'}
              type="button"
              isLoading={isPending}
              onClick={() => updateStatus(isSuspended ? 'ACTIVE' : 'SUSPENDED')}
              className="flex-1"
            >
              {isSuspended ? '계정 활성화' : '계정 정지'}
            </Button>
          </div>
        ) : (
          <div className="px-6 py-4 border-t border-[#F0EBE8]">
            <Button variant="ghost" type="button" onClick={onClose} className="w-full">닫기</Button>
          </div>
        )}
      </div>
    </>
  )
}
