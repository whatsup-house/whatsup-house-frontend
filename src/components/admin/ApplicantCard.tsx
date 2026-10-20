import type { ReactNode } from 'react'
import dayjs from 'dayjs'

export const APP_STATUS_LABEL: Record<string, string> = {
  PENDING: '대기',
  PAYMENT_PENDING: '입금확인중',
  CONFIRMED: '확정',
  ATTENDED: '출석',
  REJECTED: '반려',
  CANCELLED: '취소',
}
const APP_STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-[#F5F5F5] text-[#767676]',
  PAYMENT_PENDING: 'bg-[#FFF3E0] text-[#EF6C00]',
  CONFIRMED: 'bg-[#E3F2FD] text-[#1976D2]',
  ATTENDED: 'bg-[#E8F5E9] text-[#4CAF50]',
  REJECTED: 'bg-[#FEF3F3] text-red-500',
  CANCELLED: 'bg-[#F5F5F5] text-[#767676]',
}

export function MemberBadge({ isGuest }: { isGuest: boolean }) {
  return (
    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs ${isGuest ? 'bg-[#FFF3E0] text-[#FF9800]' : 'bg-[#E3F2FD] text-[#1976D2]'}`}>
      {isGuest ? '비회원' : '회원'}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${APP_STATUS_STYLE[status] ?? ''}`}>
      {APP_STATUS_LABEL[status] ?? status}
    </span>
  )
}

interface ApplicantCardProps {
  name: string
  isGuest: boolean
  status: string
  paymentLabel: string
  paymentClassName: string
  info: string[]          // 성별·나이·MBTI·직업 중 있는 값
  phone: string | null
  createdAt: string
  actions: ReactNode      // 하단 액션 줄 (확정·입금 확인·반려)
  className?: string
}

// 관리자 참가자 관리 모바일 카드. 실제 관리자 화면과 심사용 운영자 화면 미리보기가 같이 쓴다. (KAN-415·417)
export default function ApplicantCard({
  name, isGuest, status, paymentLabel, paymentClassName, info, phone, createdAt, actions, className = '',
}: ApplicantCardProps) {
  return (
    <li className={`px-4 py-4 flex flex-col gap-2.5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-bold text-[16px] text-[#1A1A1A] break-words">{name}</span>
          <MemberBadge isGuest={isGuest} />
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <StatusBadge status={status} />
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${paymentClassName}`}>{paymentLabel}</span>
        </div>
      </div>
      <p className="text-[14px] text-[#444444] break-words">
        {info.length > 0 ? info.join(' · ') : '-'}
      </p>
      <div className="flex items-center justify-between gap-2 text-[13px] text-[#767676]">
        {phone ? (
          <a href={`tel:${phone}`} className="inline-flex min-h-10 items-center text-[#1976D2]">{phone}</a>
        ) : <span>연락처 -</span>}
        <span className="text-[12px] whitespace-nowrap">{dayjs(createdAt).format('M/D HH:mm')} 신청</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-[#F0EBE8]">
        {actions}
      </div>
    </li>
  )
}
