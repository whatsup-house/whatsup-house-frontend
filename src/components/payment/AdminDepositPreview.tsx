'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Bell, ChevronDown, Menu, X } from 'lucide-react'
import DepositSummary from '@/components/admin/DepositSummary'
import type { DemoDepositResponse, DepositMatchResult, PaymentTargetType } from '@/lib/api/types'

const FRAME_WIDTH = 375
const FRAME_HEIGHT = 760
// 폰이 뜨고 1.5초 뒤 입금 알림, 그 1초 뒤 입금 알림 로그 맨 위에 본인 입금 카드가 쌓인다 (KAN-421·423)
const PUSH_DELAY_MS = 1500
const SETTLE_DELAY_MS = 1000
// lg↑ 오른쪽 고정 패널 폭. 열려 있는 동안 앱 셸이 이만큼 비켜 준다 (globals.css html[data-admin-preview] 와 같은 값)
const SIDE_PANEL_WIDTH = 420
// 패널은 앱 프레임 오른쪽 끝에 붙인다. 프레임 오른쪽 끝 = min(셸 오른쪽 끝(50vw+560), 비켜 준 자리(100vw-420)) (globals.css 와 같은 식)
const SIDE_PANEL_LEFT = `min(50vw + 560px, 100vw - ${SIDE_PANEL_WIDTH}px)`

interface AdminDepositPreviewProps {
  response: DemoDepositResponse
  payerName: string                 // 본인 이름 (다른 회원 정보는 쓰지 않는다)
  amount: number
  targetType: PaymentTargetType
  targetName: string | null
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

// 목록처럼 보이게 하는 가짜 입금 알림. 다른 회원 정보는 절대 쓰지 않는다.
const PLACEHOLDERS: { name: string; amount: number; targetType: PaymentTargetType | null; targetName: string | null; result: DepositMatchResult; isManual?: boolean }[] = [
  { name: '김하늘', amount: 9900, targetType: 'TICKET_PASS', targetName: '1회권', result: 'MATCHED' },
  { name: '이도윤', amount: 50000, targetType: 'DEPOSIT', targetName: '우연한 식탁', result: 'MATCHED', isManual: true },
  { name: '박서연', amount: 30000, targetType: null, targetName: null, result: 'NO_CANDIDATE' },
  { name: '정민준', amount: 9900, targetType: 'TICKET_PASS', targetName: '1회권', result: 'MATCHED' },
]

// 은행 푸시는 이름 뒤 공백 덩어리에서 한 줄 내려 보여준다 (표시만, 원문은 그대로)
const pushBody = (rawText: string) => rawText.replace(/ {2,}/, '\n')

// 심사용: 운영자 폰의 "결제 관리" 모바일 화면에 은행 입금 알림이 오고 입금 카드가 자동 완료로 쌓이는 모습을 보여준다. (KAN-417·423)
export default function AdminDepositPreview({ response, payerName, amount, targetType, targetName, onSettled, onClose }: AdminDepositPreviewProps) {
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
        <p className="text-base font-bold text-foreground">관리자 페이지</p>
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
        <h1 className="mb-4 text-[22px] font-bold text-foreground">결제 관리</h1>
        <div className="mb-4 flex gap-1 border-b border-tag-bg">
          <span className="-mb-px border-b-2 border-primary px-3 py-2 text-sm font-semibold text-primary">입금 알림 로그</span>
          <span className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-tag-text">송금 목록</span>
        </div>
        <ul className="flex flex-col gap-3">
          {isSettled && (
            <li className="flex animate-field-reveal items-center gap-3 rounded-card bg-card p-4 shadow-sm ring-2 ring-primary">
              <DepositSummary
                name={payerName}
                amount={response.parsedAmount ?? amount}
                targetType={isMatched ? targetType : null}
                targetName={isMatched ? targetName : null}
                result={response.result}
              />
              <ChevronDown size={18} className="shrink-0 text-tag-text" />
            </li>
          )}
          {PLACEHOLDERS.map((item) => (
            <li key={item.name} className="flex select-none items-center gap-3 rounded-card bg-card p-4 opacity-45 shadow-sm blur-[1.5px]">
              <DepositSummary {...item} />
              <ChevronDown size={18} className="shrink-0 text-tag-text" />
            </li>
          ))}
        </ul>
      </div>

      {/* 운영자 폰에 온 은행 푸시 알림 */}
      {isPushed && (
        <div className="absolute inset-x-2 top-2 z-10 animate-push-in rounded-[18px] bg-card/95 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-sky-600 text-[10px] font-bold text-white">W</span>
            <span className="flex-1 truncate text-xs font-semibold text-tag-text">{t('pushApp')}</span>
            <span className="text-xs text-tag-text">{t('now')}</span>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-snug text-foreground">{pushBody(response.rawText)}</p>
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
      className={`fixed z-[110] flex flex-col justify-center gap-3 ${isSide ? 'inset-y-0 items-start pl-6' : 'inset-0 items-center bg-foreground/85 p-4'}`}
      style={isSide ? { left: SIDE_PANEL_LEFT, width: SIDE_PANEL_WIDTH } : undefined}
    >
      <div className="flex items-center justify-between gap-2" style={{ width: FRAME_WIDTH * scale }}>
        <span className="pl-2.5 text-sm font-bold text-white">{label}</span>
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
