'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminGatheringApi, AdminGatheringListItem, ApplicationStatus } from '@/lib/api/adminGathering'
import { useAdminApplications, useUpdateApplicationStatus, useUpdatePaymentStatus, useDeleteApplication } from '@/lib/hooks/useAdminGathering'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight, Users, MapPin, Clock } from 'lucide-react'
import { useCalendarDots } from '@/lib/hooks/useGatherings'
import { usePendingDeposits, usePendingDepositCount, useConfirmDeposit } from '@/lib/hooks/useAdminTicket'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

const STATUS_LABEL: Record<string, string> = {
  RECRUITING: '모집중',
  CLOSED: '마감',
  COMPLETED: '진행완료',
  CANCELLED: '취소',
}
const STATUS_STYLE: Record<string, string> = {
  RECRUITING: 'bg-[#FDECEA] text-[#C8392B]',
  CLOSED: 'bg-[#F5F5F5] text-[#767676]',
  COMPLETED: 'bg-[#E8F5E9] text-[#4CAF50]',
  CANCELLED: 'bg-[#FEF3F3] text-red-400',
}

// ─── 미니 캘린더 컴포넌트 ──────────────────────────────────────────────
interface MiniCalendarProps {
  year: number
  month: number
  selectedDate: string
  dotDates: string[]
  onSelectDate: (date: string) => void
  onChangeMonth: (year: number, month: number) => void
}

function MiniCalendar({ year, month, selectedDate, dotDates, onSelectDate, onChangeMonth }: MiniCalendarProps) {
  const firstDay = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
  const startDayOfWeek = firstDay.day()
  const daysInMonth = firstDay.daysInMonth()
  const today = dayjs().format('YYYY-MM-DD')

  const cells: (number | null)[] = [
    ...Array(startDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const handlePrev = () => {
    const d = firstDay.subtract(1, 'month')
    onChangeMonth(d.year(), d.month() + 1)
  }
  const handleNext = () => {
    const d = firstDay.add(1, 'month')
    onChangeMonth(d.year(), d.month() + 1)
  }

  return (
    <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] p-5 shrink-0 w-full max-w-[360px] lg:w-[320px]">
      {/* 월 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrev}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F0EB] transition-colors"
        >
          <ChevronLeft size={18} className="text-[#767676]" />
        </button>
        <span className="font-bold text-[15px] text-[#1A1A1A]">{year}년 {month}월</span>
        <button
          onClick={handleNext}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F0EB] transition-colors"
        >
          <ChevronRight size={18} className="text-[#767676]" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-[#C8392B]' : 'text-[#767676]'}`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="h-10" />

          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === today
          const hasDot = dotDates.includes(dateStr)
          const isSunday = idx % 7 === 0

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className="flex flex-col items-center py-1 gap-0.5 h-10 justify-center"
            >
              <span
                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors
                  ${isSelected ? 'bg-[#C8392B] text-white font-semibold' : ''}
                  ${!isSelected && isToday ? 'text-[#C8392B] font-semibold' : ''}
                  ${!isSelected && !isToday && isSunday ? 'text-[#C8392B]' : ''}
                  ${!isSelected && !isToday && !isSunday ? 'text-[#1A1A1A] hover:bg-[#F5F0EB]' : ''}
                `}
              >
                {day}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  hasDot ? (isSelected ? 'bg-white' : 'bg-[#C8392B]') : 'bg-transparent'
                }`}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── 게더링 카드 컴포넌트 ───────────────────────────────────────────────
interface GatheringCardProps {
  gathering: AdminGatheringListItem
  isSelected: boolean
  onClick: () => void
}

function GatheringCard({ gathering, isSelected, onClick }: GatheringCardProps) {
  const fillRate = gathering.capacity > 0 ? (gathering.currentApplicants / gathering.capacity) * 100 : 0

  return (
    <button
      onClick={onClick}
      className={`
        shrink-0 w-[220px] h-full text-left rounded-[16px] p-4 border-2 transition-all
        ${isSelected
          ? 'border-[#C8392B] bg-[#FDECEA] shadow-[0_4px_16px_rgba(200,57,43,0.2)]'
          : 'border-transparent bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:border-[#C8392B]/40'
        }
      `}
    >
      {/* 상태 뱃지 */}
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[gathering.status] ?? ''}`}>
        {STATUS_LABEL[gathering.status] ?? gathering.status}
      </span>

      {/* 제목 */}
      <p className="font-bold text-[14px] text-[#1A1A1A] mt-2 mb-3 line-clamp-2 leading-snug">
        {gathering.title}
      </p>

      {/* 정보 */}
      <div className="flex flex-col gap-1.5 text-xs text-[#767676]">
        <div className="flex items-center gap-1.5">
          <Clock size={12} />
          <span>{gathering.startTime.slice(0, 5)} ~ {gathering.endTime?.slice(0, 5) ?? ''}</span>
        </div>
        {gathering.locationName && (
          <div className="flex items-center gap-1.5">
            <MapPin size={12} />
            <span className="truncate">{gathering.locationName}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Users size={12} />
          <span>{gathering.currentApplicants}/{gathering.capacity}명</span>
        </div>
      </div>

      {/* 신청률 바 */}
      <div className="mt-3 w-full h-1.5 bg-[#F0EBE8] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isSelected ? 'bg-[#C8392B]' : 'bg-[#C8392B]/60'}`}
          style={{ width: `${Math.min(fillRate, 100)}%` }}
        />
      </div>
    </button>
  )
}

const APP_STATUS_LABEL: Record<string, string> = {
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
const NEXT_APP_STATUS: Record<string, ApplicationStatus | undefined> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'ATTENDED',
}

// ─── 참가자 테이블 ──────────────────────────────────────────────────────
function ParticipantTable({ gatheringId }: { gatheringId: string }) {
  const { data: participants = [], isLoading } = useAdminApplications(gatheringId)
  const { mutate: changeStatus } = useUpdateApplicationStatus(gatheringId)
  const { mutate: changePayment } = useUpdatePaymentStatus(gatheringId)
  const { mutate: deleteApplication, isPending: isDeleting, variables: deletingId } = useDeleteApplication(gatheringId)

  if (isLoading) {
    return <div className="flex justify-center py-12"><LoadingSpinner /></div>
  }

  if (participants.length === 0) {
    return (
      <div className="bg-white rounded-[12px] p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        <p className="text-base font-medium text-[#1A1A1A] mb-1">참가자가 없습니다.</p>
        <p className="text-sm text-[#767676]">이 게더링에 아직 신청자가 없어요.</p>
      </div>
    )
  }

  const confirmedCount = participants.filter((p) => p.status === 'CONFIRMED').length
  const attendedCount = participants.filter((p) => p.status === 'ATTENDED').length

  return (
    <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-x-auto">
      <div className="min-w-[1080px] px-4 py-3 border-b border-tag-bg flex items-center gap-3">
        <span className="text-sm font-bold text-[#1A1A1A]">총 {participants.length}명 신청</span>
        {confirmedCount > 0 && (
          <span className="px-2 py-0.5 bg-[#E3F2FD] text-[#1976D2] rounded-full text-xs font-medium">
            확정 {confirmedCount}명
          </span>
        )}
        {attendedCount > 0 && (
          <span className="px-2 py-0.5 bg-[#E8F5E9] text-[#4CAF50] rounded-full text-xs font-medium">
            출석 {attendedCount}명
          </span>
        )}
      </div>
      <table className="w-full min-w-[1080px]">
        <thead>
          <tr className="bg-[#F5F5F5] text-xs text-[#767676] uppercase">
            {['예약번호', '이름', '구분', '성별', '나이', '직업', 'MBTI', '연락처', '신청일시', '상태', '입금', '삭제'].map((col) => (
              <th key={col} className="px-4 py-3 text-left font-medium">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => {
            const nextStatus = NEXT_APP_STATUS[p.status]
            return (
              <tr key={p.id} className="border-t border-[#F0EBE8] hover:bg-[#F5F0EB] transition-colors">
                <td className="px-4 py-3 text-[12px] text-[#767676] whitespace-nowrap">{p.bookingNumber ?? '-'}</td>
                <td className="px-4 py-3 font-medium text-[14px]">{p.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${p.isGuest ? 'bg-[#FFF3E0] text-[#FF9800]' : 'bg-[#E3F2FD] text-[#1976D2]'}`}>
                    {p.isGuest ? '비회원' : '회원'}
                  </span>
                </td>
                <td className="px-4 py-3 text-[13px] text-[#767676]">
                  {p.gender === 'MALE' ? '남' : p.gender === 'FEMALE' ? '여' : '-'}
                </td>
                <td className="px-4 py-3 text-[13px] text-[#767676]">{p.age ?? '-'}</td>
                <td className="px-4 py-3 text-[13px] text-[#767676]">{p.job ?? '-'}</td>
                <td className="px-4 py-3">
                  {p.mbti ? (
                    <span className="px-2 py-0.5 bg-[#F0EBE8] text-[#5C4033] rounded-full text-xs">{p.mbti}</span>
                  ) : <span className="text-[13px] text-[#767676]">-</span>}
                </td>
                <td className="px-4 py-3 text-[13px] text-[#767676]">{p.phone ?? '-'}</td>
                <td className="px-4 py-3 text-[12px] text-[#767676] whitespace-nowrap">
                  {dayjs(p.createdAt).format('M/D HH:mm')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${APP_STATUS_STYLE[p.status] ?? ''}`}>
                      {APP_STATUS_LABEL[p.status] ?? p.status}
                    </span>
                    {nextStatus && (
                      <button
                        onClick={() => changeStatus({ id: p.id, status: nextStatus })}
                        className="text-xs text-primary hover:underline"
                      >
                        {nextStatus === 'CONFIRMED' ? '확정' : '출석'}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {p.free ? (
                    <span className="text-[12px] text-[#BBBBBB]">무료</span>
                  ) : p.gatheringType === 'RANDOM_TABLE' ? (
                    <span className={`text-xs font-medium ${
                      p.status === 'CONFIRMED' || p.status === 'ATTENDED'
                        ? 'text-[#4CAF50]'
                        : 'text-[#C8392B]'
                    }`}>
                      {p.status === 'CONFIRMED' || p.status === 'ATTENDED' ? '이용권 처리' : '이용권 확인중'}
                    </span>
                  ) : !p.paid ? (
                    <span className="text-[12px] text-[#BBBBBB]">무료</span>
                  ) : p.status === 'CONFIRMED' || p.status === 'ATTENDED' ? (
                    // 선확정 후입금: 확정(또는 출석)된 신청만 입금을 받으므로 그때만 체크박스를 노출한다. (KAN-243)
                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={p.paymentConfirmed}
                        onChange={(e) => changePayment({ id: p.id, confirmed: e.target.checked })}
                        className="w-4 h-4 accent-[#C8392B] cursor-pointer"
                      />
                      <span className={`text-xs font-medium ${p.paymentConfirmed ? 'text-[#4CAF50]' : 'text-[#767676]'}`}>
                        {p.paymentConfirmed ? '완료' : '확인 중'}
                      </span>
                    </label>
                  ) : (
                    <span className="text-[12px] text-[#BBBBBB]">확정 후</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {p.status === 'ATTENDED' ? (
                    <span className="text-[12px] text-[#BBBBBB]">반려 불가</span>
                  ) : isDeleting && deletingId === p.id ? (
                    <span className="text-[12px] text-[#767676]">삭제 중…</span>
                  ) : (
                    <button
                      onClick={() => {
                        if (confirm('이 신청을 반려하시겠습니까?')) deleteApplication(p.id)
                      }}
                      disabled={isDeleting}
                      className="text-red-500 text-[13px] hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      반려
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── 우연한식탁 이용권 입금확인 큐 ─────────────────────────────────────
function DepositQueue() {
  const { data: deposits = [], isLoading } = usePendingDeposits()
  const { mutate: confirmDeposit, isPending } = useConfirmDeposit()

  if (isLoading) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (deposits.length === 0) {
    return (
      <div className="bg-white rounded-[12px] p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        <p className="text-base font-medium text-[#1A1A1A] mb-1">우연한식탁 이용권 입금확인 요청이 없어요</p>
        <p className="text-sm text-[#767676]">고객이 이용권 구매 요청 후 입금하면 여기에 오래된 순으로 표시돼요.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[12px] overflow-x-auto shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#F5F0EB] text-[#767676] text-left">
            {['신청자', '구분', '게더링', '예약번호', '상품', '금액', '요청 시각', '입금확인'].map((col) => (
              <th key={col} className="px-4 py-3 font-medium whitespace-nowrap">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deposits.map((d) => (
            <tr key={d.ticketPassId} className="border-t border-[#F0EDE8]">
              <td className="px-4 py-3 font-medium text-[#1A1A1A] whitespace-nowrap">{d.applicantName}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`text-xs px-2 py-0.5 rounded-full ${d.member ? 'bg-[#E8F5E9] text-[#4CAF50]' : 'bg-[#F5F0EB] text-[#767676]'}`}>
                  {d.member ? '회원' : '비회원'}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{d.gatheringTitle ?? '-'}</td>
              <td className="px-4 py-3 whitespace-nowrap text-[#767676]">{d.bookingNumber ?? '-'}</td>
              <td className="px-4 py-3 whitespace-nowrap">{d.productLabel}</td>
              <td className="px-4 py-3 whitespace-nowrap">{d.amount.toLocaleString()}원</td>
              <td className="px-4 py-3 whitespace-nowrap text-[#767676]">{dayjs(d.requestedAt).format('M/D HH:mm')}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <button
                  disabled={isPending}
                  onClick={() => {
                    if (confirm(`${d.applicantName}님의 입금을 확인하고 이용권을 발급할까요?`)) {
                      confirmDeposit(d.ticketPassId)
                    }
                  }}
                  className="px-3 py-1.5 rounded-full bg-[#C8392B] text-white text-xs font-medium disabled:opacity-50"
                >
                  입금확인
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── 메인 페이지 ───────────────────────────────────────────────────────
export default function AdminApplicationsPage() {
  const [view, setView] = useState<'byGathering' | 'deposits'>('byGathering')
  const { data: depositCount = 0 } = usePendingDepositCount()
  const today = dayjs()
  const [selectedDate, setSelectedDate] = useState(today.format('YYYY-MM-DD'))
  const [currentYear, setCurrentYear] = useState(today.year())
  const [currentMonth, setCurrentMonth] = useState(today.month() + 1)
  const [selectedGatheringId, setSelectedGatheringId] = useState<string>('')

  // 달력 dot (게더링이 있는 날짜)
  const { data: calendarDots = [] } = useCalendarDots(currentYear, currentMonth)

  // 선택된 날짜의 게더링 목록
  const { data: dayGatherings = [], isLoading: isGatheringsLoading } = useQuery({
    queryKey: ['admin', 'gatherings-by-date', selectedDate],
    queryFn: () => adminGatheringApi.getAll(undefined, selectedDate),
  })

  const handleSelectDate = (date: string) => {
    setSelectedDate(date)
    setSelectedGatheringId('')
  }

  const handleChangeMonth = (year: number, month: number) => {
    setCurrentYear(year)
    setCurrentMonth(month)
  }

  const selectedGathering = dayGatherings.find((g) => g.id === selectedGatheringId)
  const selectedDayjs = dayjs(selectedDate)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-bold text-[22px] text-foreground">참가자 관리</h1>
      </div>

      {/* 뷰 전환: 게더링별 조회 / 우연한식탁 이용권 입금확인 큐 */}
      <div className="flex gap-2 mb-5">
        {([['byGathering', '게더링별 조회'], ['deposits', '우연한식탁 이용권 입금확인']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              view === key ? 'bg-[#C8392B] text-white' : 'bg-[#F5F0EB] text-[#767676]'
            }`}
          >
            {label}
            {key === 'deposits' && depositCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white text-[#C8392B] text-[11px] font-bold">
                {depositCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {view === 'deposits' ? (
        <DepositQueue />
      ) : (
      <>
      {/* 상단: 캘린더 + 게더링 카드 리스트 */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6 items-start">
        {/* 미니 캘린더 */}
        <MiniCalendar
          year={currentYear}
          month={currentMonth}
          selectedDate={selectedDate}
          dotDates={calendarDots.map((d) => d.date)}
          onSelectDate={handleSelectDate}
          onChangeMonth={handleChangeMonth}
        />

        {/* 게더링 카드 영역 */}
        <div className="w-full flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1A1A1A] mb-3">
            {selectedDayjs.format('M월 D일')} 게더링
            {dayGatherings.length > 0 && (
              <span className="ml-2 text-[#767676] font-normal">{dayGatherings.length}건</span>
            )}
          </p>

          {isGatheringsLoading ? (
            <div className="h-[200px] flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : dayGatherings.length === 0 ? (
            <div className="h-[200px] bg-white rounded-[16px] flex flex-col items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <p className="text-[#767676] text-sm font-medium">이 날은 게더링이 없어요.</p>
              <p className="text-[#767676] text-xs mt-1">다른 날짜를 선택해주세요.</p>
            </div>
          ) : (
            /* 가로 스크롤 카드 리스트 */
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-3 h-[200px]">
                {dayGatherings.map((g) => (
                  <GatheringCard
                    key={g.id}
                    gathering={g}
                    isSelected={selectedGatheringId === g.id}
                    onClick={() => setSelectedGatheringId(
                      selectedGatheringId === g.id ? '' : g.id
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단: 참가자 테이블 */}
      {selectedGatheringId ? (
        <>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
            <h2 className="w-full sm:w-auto font-bold text-[16px] text-foreground">
              {selectedGathering?.title} — 참가자 목록
            </h2>
            <span className="px-3 py-1 bg-[#F5F0EB] rounded-full text-sm">
              정원 {selectedGathering?.capacity}명
            </span>
            <span className="px-3 py-1 bg-[#FDECEA] text-[#C8392B] rounded-full text-sm">
              신청 {selectedGathering?.currentApplicants}명
            </span>
          </div>
          <ParticipantTable gatheringId={selectedGatheringId} />
        </>
      ) : (
        <div className="bg-white rounded-[12px] p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <p className="text-base font-medium text-[#1A1A1A] mb-1">게더링을 선택해주세요</p>
          <p className="text-sm text-[#767676]">위 캘린더에서 날짜를 선택하고, 게더링 카드를 클릭하면 참가자 목록이 표시돼요.</p>
        </div>
      )}
      </>
      )}
    </div>
  )
}
