'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Ticket, CalendarDays } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import { confirmGuestEmailVerification, requestGuestEmailVerification } from '@/lib/api/auth'
import { fetchGuestOverview } from '@/lib/api/guest'
import type { ApplicationStatus, GuestOverview } from '@/lib/api/types'

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  PENDING: '심사중',
  PAYMENT_PENDING: '입금확인중',
  CONFIRMED: '참가 확정',
  REJECTED: '승인 거절',
  CANCELLED: '취소',
  ATTENDED: '참석 완료',
}

export default function GuestOverviewPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [overview, setOverview] = useState<GuestOverview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const requestCode = async () => {
    if (!/^01\d{8,9}$/.test(phone.replace(/-/g, ''))) {
      setError('올바른 연락처를 입력해 주세요.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('올바른 이메일을 입력해 주세요.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await requestGuestEmailVerification(email.trim())
      setCodeSent(true)
    } catch {
      setError('인증번호 발송에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  const verifyAndLoad = async () => {
    setLoading(true)
    setError('')
    try {
      await confirmGuestEmailVerification(email.trim(), code.trim())
      const data = await fetchGuestOverview(phone.replace(/-/g, ''), email.trim())
      setOverview(data)
    } catch (cause) {
      const message = (cause as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message ?? '인증번호 또는 입력 정보를 확인해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  if (overview) {
    return (
      <main className="min-h-screen bg-background px-5 py-7">
        <h1 className="text-xl font-bold">비회원 이용내역</h1>
        <p className="mt-1 text-sm text-tag-text">{overview.name}님의 이용권과 신청 내역이에요.</p>

        <Card className="mt-6 p-5 bg-primary-light">
          <div className="flex items-center gap-2 text-primary"><Ticket size={20} /><strong>보유 이용권</strong></div>
          <p className="mt-4 text-3xl font-bold text-primary">{overview.totalRemaining}회</p>
          <p className="mt-1 text-xs text-tag-text">현재 사용 가능한 잔여 횟수</p>
        </Card>

        <section className="mt-7">
          <div className="mb-3 flex items-center gap-2"><CalendarDays size={19} className="text-primary" /><h2 className="font-bold">신청 내역</h2></div>
          <div className="space-y-3">
            {overview.applications.length === 0 && <Card className="p-5 text-sm text-tag-text">신청 내역이 없어요.</Card>}
            {overview.applications.map((application) => (
              <button
                key={application.id}
                type="button"
                className="w-full text-left"
                onClick={() => {
                  if (application.status === 'CONFIRMED' || application.status === 'ATTENDED') {
                    router.push(`/gatherings/${application.gathering.id}/apply/confirmed?bookingNumber=${encodeURIComponent(application.bookingNumber)}`)
                  } else {
                    router.push(`/applications/check?bookingNumber=${encodeURIComponent(application.bookingNumber)}`)
                  }
                }}
              >
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-bold">{application.gathering.title}</p><p className="mt-1 text-xs text-tag-text">{application.gathering.eventDate} · {application.bookingNumber}</p></div>
                    <span className="shrink-0 text-xs font-bold text-primary">{STATUS_LABEL[application.status]}</span>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-2"><Mail size={22} className="text-primary" /><h1 className="text-xl font-bold">비회원 이용내역 조회</h1></div>
        <p className="mt-2 text-sm text-tag-text">신청할 때 사용한 연락처와 이메일을 인증해 주세요.</p>

        <Card className="mt-7 space-y-4 p-5">
          <Input label="연락처" placeholder="01012345678" value={phone} onChange={(event) => setPhone(event.target.value)} disabled={codeSent} />
          <Input label="이메일" type="email" placeholder="email@example.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={codeSent} />
          {codeSent && <Input label="인증번호" inputMode="numeric" maxLength={6} placeholder="6자리 인증번호" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} />}
          {error && <p className="text-sm text-primary">{error}</p>}
          <Button className="w-full" size="lg" isLoading={loading} onClick={codeSent ? verifyAndLoad : requestCode}>
            {codeSent ? '인증하고 이용내역 보기' : '인증번호 받기'}
          </Button>
          {codeSent && <button type="button" className="w-full text-xs text-tag-text underline" onClick={() => { setCodeSent(false); setCode(''); setError('') }}>연락처·이메일 다시 입력</button>}
        </Card>
      </div>
    </main>
  )
}
