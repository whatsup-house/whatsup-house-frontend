'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import dayjs from 'dayjs'
import { Bell, Menu, X } from 'lucide-react'
import ApplicantCard from '@/components/admin/ApplicantCard'
import type { DemoDepositResponse } from '@/lib/api/types'

const FRAME_WIDTH = 375
const FRAME_HEIGHT = 760
// 폰이 뜨고 1.5초 뒤 입금 알림, 그 1초 뒤 참가자 목록 맨 위에 본인 카드가 쌓인다 (KAN-421)
const PUSH_DELAY_MS = 1500
const SETTLE_DELAY_MS = 1000
// lg↑ 오른쪽 고정 패널 폭. 열려 있는 동안 앱 셸이 이만큼 비켜 준다 (globals.css html[data-admin-preview] 와 같은 값)
const SIDE_PANEL_WIDTH = 420

export interface AdminPreviewApplicant {
  name: string
  info: string[]      // 성별·나이·MBTI·직업 (본인 프로필에서만)
  appliedAt: string
}

export interface AdminPreviewSession {
  eventDate: string | null
  region: string | null
}

interface AdminDepositPreviewProps {
  response: DemoDepositResponse
  applicant: AdminPreviewApplicant
  session: AdminPreviewSession
  onSettled: () => void
  onClose: () => void
}

type Layout = { mode: 'side' | 'sheet'; scale: number }

// lg↑는 앱 오른쪽 패널(앱 셸이 왼쪽으로 비켜 줌), 그 아래는 전체 화면 시트. 프레임은 자리에 맞게 줄인다.
function measureLayout(): Layout {
  const { innerWidth: vw, innerHeight: vh } = window
  if (vw >= 1024) {
    return { mode: 'side', scale: Math.min(1, (SIDE_PANEL_WIDTH - 48) / FRAME_WIDTH, (vh - 140) / FRAME_HEIGHT) }
  }
  return { mode: 'sheet', scale: Math.min(1, (vw - 32) / FRAME_WIDTH, (vh - 170) / FRAME_HEIGHT) }
}

// 목록처럼 보이게 하는 가짜 참가자. 다른 회원 정보는 절대 쓰지 않는다.
const PLACEHOLDERS = [
  { name: '참가자 A', info: ['여', '29세', 'ENFP', '디자이너'], hoursAgo: 26 },
  { name: '참가자 B', info: ['남', '31세', 'ISTJ', '개발자'], hoursAgo: 20 },
  { name: '참가자 C', info: ['여', '27세', 'INFJ', '마케터'], hoursAgo: 9 },
]

const PAID = { label: '이용권 처리', cls: 'bg-[#E8F5E9] text-[#4CAF50]' }
const PAYMENT_BADGE = {
  waiting: { label: '입금 대기', cls: 'bg-[#FFF3E0] text-[#EF6C00]' },
  matched: { label: '입금 완료', cls: 'bg-[#E8F5E9] text-[#4CAF50]' },
  exception: { label: '예외함 확인 필요', cls: 'bg-[#FEF3F3] text-red-500' },
}

// 실제 관리자 카드의 모바일 액션 버튼과 같은 모양 (미리보기라 동작하지 않는다)
const actionsFor = (status: string) => (
  <>
    {status === 'CONFIRMED' && <span className="inline-flex min-h-10 items-center px-4 rounded-full bg-[#FDECEA] text-[#C8392B] text-[13px] font-medium">출석</span>}
    <span className="ml-auto inline-flex min-h-10 items-center px-4 rounded-full bg-[#FEF3F3] text-red-500 text-[13px] font-medium">반려</span>
  </>
)

// 심사용: 운영자 폰의 "참가자 관리" 모바일 화면에 은행 입금 알림이 오고 결제 상태가 바뀌는 모습을 보여준다. (KAN-417)
export default function AdminDepositPreview({ response, applicant, session, onSettled, onClose }: AdminDepositPreviewProps) {
  const t = useTranslations('payment.simulator')
  const [layout, setLayout] = useState(measureLayout)
  // 0 폰만 · 1 입금 알림 · 2 목록에 반영. 모션 줄이기면 마지막 단계를 바로 보여준다
  const [phase, setPhase] = useState(() => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 2 : 0))
  const isPushed = phase >= 1
  const isSettled = phase === 2

  const isSide = layout.mode === 'side'

  // 패널이 떠 있는 동안 앱 셸이 왼쪽으로 비켜 주게 표시한다. 닫히면(언마운트) 원래 가운데 배치로 돌아간다.
  useEffect(() => {
    document.documentElement.toggleAttribute('data-admin-preview', isSide)
    return () => document.documentElement.removeAttribute('data-admin-preview')
  }, [isSide])

  useEffect(() => {
    const handleResize = () => setLayout(measureLayout())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (isSettled) {
      onSettled()
      return
    }
    const timer = setTimeout(() => setPhase(phase + 1), phase === 0 ? PUSH_DELAY_MS : SETTLE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [phase, isSettled, onSettled])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const isMatched = response.result === 'MATCHED'
  const payment = isMatched ? PAYMENT_BADGE.matched : PAYMENT_BADGE.exception
  const status = isMatched ? 'CONFIRMED' : 'PAYMENT_PENDING'
  const highlight = isMatched ? 'bg-primary-light' : 'bg-red-50'
  const totalCount = PLACEHOLDERS.length + (isSettled ? 1 : 0)
  const confirmedCount = 1 + (isSettled && isMatched ? 1 : 0)
  const placeholder = (index: number) => {
    const item = PLACEHOLDERS[index]
    return (
      <ApplicantCard
        key={item.name}
        name={item.name}
        isGuest={false}
        status={index === 0 ? 'CONFIRMED' : 'PAYMENT_PENDING'}
        paymentLabel={index === 0 ? PAID.label : PAYMENT_BADGE.waiting.label}
        paymentClassName={index === 0 ? PAID.cls : PAYMENT_BADGE.waiting.cls}
        info={item.info}
        phone={null}
        createdAt={dayjs(applicant.appliedAt).subtract(item.hoursAgo, 'hour').toISOString()}
        actions={actionsFor(index === 0 ? 'CONFIRMED' : 'PAYMENT_PENDING')}
        className="opacity-45 blur-[1.5px] select-none"
      />
    )
  }

  const screen = (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[36px] bg-background">
      {/* 상태 표시줄 */}
      <div className="relative flex h-9 shrink-0 items-center justify-between bg-card px-7 text-[13px] font-semibold text-foreground">
        <span>9:41</span>
        <span className="absolute left-1/2 top-2 h-6 w-24 -translate-x-1/2 rounded-full bg-foreground" />
        <span>5G</span>
      </div>

      {/* 관리자 모바일 상단바 (admin/layout 과 같은 모양) */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-tag-bg bg-card px-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-tag-text">The Curator&apos;s</p>
          <p className="text-sm font-bold text-primary leading-tight">House Admin</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative p-1 min-w-[36px] min-h-[36px] flex items-center justify-center text-foreground">
            <Bell size={20} />
            {isSettled && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold leading-none">1</span>
            )}
          </span>
          <span className="flex h-10 w-10 items-center justify-center rounded-input border border-tag-bg text-foreground"><Menu size={20} /></span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-6">
        <h1 className="mb-5 font-bold text-[22px] text-foreground">참가자 관리</h1>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h2 className="w-full font-bold text-[16px] text-foreground">우연한 식탁 (심사용) — 참가자 목록</h2>
          {session.eventDate && <span className="px-3 py-1 bg-[#F5F0EB] rounded-full text-sm">{dayjs(session.eventDate).format('M월 D일')}</span>}
          {session.region && <span className="px-3 py-1 bg-[#F5F0EB] rounded-full text-sm">{session.region}</span>}
          <span className="px-3 py-1 bg-[#FDECEA] text-[#C8392B] rounded-full text-sm">신청 {totalCount}명</span>
        </div>
        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="px-4 py-3 border-b border-tag-bg flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-sm font-bold text-[#1A1A1A]">총 {totalCount}명 신청</span>
            <span className="px-2 py-0.5 bg-[#E3F2FD] text-[#1976D2] rounded-full text-xs font-medium">확정 {confirmedCount}명</span>
          </div>
          <ul className="divide-y divide-[#F0EBE8]">
            {isSettled && (
              <ApplicantCard
                name={applicant.name}
                isGuest={false}
                status={status}
                paymentLabel={payment.label}
                paymentClassName={payment.cls}
                info={applicant.info}
                phone={null}
                createdAt={applicant.appliedAt}
                actions={actionsFor(status)}
                className={`animate-field-reveal ${highlight}`}
              />
            )}
            {placeholder(0)}
            {placeholder(1)}
            {placeholder(2)}
          </ul>
        </div>
      </div>

      {/* 운영자 폰에 온 은행 푸시 알림 */}
      {isPushed && (
        <div className="absolute inset-x-2 top-2 z-10 animate-push-in rounded-[18px] bg-card/95 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-sky-600 text-[10px] font-bold text-white">W</span>
            <span className="flex-1 truncate text-xs font-semibold text-tag-text">{t('pushApp')}</span>
            <span className="text-xs text-tag-text">{t('now')}</span>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-snug text-foreground">{response.rawText}</p>
        </div>
      )}
    </div>
  )

  const { scale } = layout
  const label = t('previewLabel')

  return createPortal(
    <div
      role={isSide ? 'region' : 'dialog'}
      aria-modal={isSide ? undefined : true}
      aria-label={label}
      className={`fixed z-[110] flex flex-col items-center justify-center gap-3 ${isSide ? 'inset-y-0 right-0 px-6' : 'inset-0 bg-foreground/85 p-4'}`}
      style={isSide ? { width: SIDE_PANEL_WIDTH } : undefined}
    >
      <div className="flex items-center justify-between gap-2" style={{ width: FRAME_WIDTH * scale }}>
        <span className="text-sm font-bold text-white">{label}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          autoFocus={!isSide}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
        >
          <X size={18} />
        </button>
      </div>

      <div className="shrink-0" style={{ width: FRAME_WIDTH * scale, height: FRAME_HEIGHT * scale }}>
        <div
          aria-hidden="true"
          className="origin-top-left rounded-[46px] border-[10px] border-foreground bg-foreground shadow-2xl"
          style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT, transform: `scale(${scale})` }}
        >
          {screen}
        </div>
      </div>

      <p className="text-center text-xs leading-relaxed text-white/80 break-keep" style={{ maxWidth: FRAME_WIDTH * scale }}>{t('caption')}</p>
      <p role="status" className="sr-only">
        {isPushed && `${t('pushApp')}: ${response.rawText}`}
        {isSettled && ` ${isMatched ? t('resultMatched') : t('resultException')}`}
      </p>
    </div>,
    document.body,
  )
}
