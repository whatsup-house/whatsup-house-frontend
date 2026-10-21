'use client'

import { useState } from 'react'
import dayjs from 'dayjs'
import { X } from 'lucide-react'
import type { DiningCriterion, DiningPairScore } from '@/lib/api/types'
import { useDiningTableExplanation } from '@/lib/hooks/useAdminDining'
import { genderShort, tableLabel } from '@/lib/utils/diningStatus'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'
import { ApiErrorMessage, LoadingSpinner } from '@/components/ui'
import DiningMatchGraph, { pairKey } from './DiningMatchGraph'

const CRITERION_LABEL: Record<DiningCriterion, string> = {
  ageBand: '연령대',
  gender: '성별',
  mbti: 'MBTI',
  interests: '관심사',
  wantedStyle: '대화 스타일',
  custom: '취향',
}
const CRITERIA = Object.keys(CRITERION_LABEL) as DiningCriterion[]

const percent = (value: number) => `${Math.round(value * 100)}%`

interface DiningTableExplanationModalProps {
  sessionId: string
  tableId: string
  onClose: () => void
}

// 매칭 근거 (KAN-434): 그룹 점수·장점·감점, 직업 캐릭터 궁합 그래프, 쌍별 항목 근거, 멤버 응답 원문
export default function DiningTableExplanationModal({ sessionId, tableId, onClose }: DiningTableExplanationModalProps) {
  const { data, isLoading, isError, error, refetch } = useDiningTableExplanation(sessionId, tableId)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const renderBody = () => {
    if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>
    if (isError || !data) {
      return <ApiErrorMessage message={getAdminApiErrorMessage(error, '매칭 근거를 불러오지 못했어요.')} onRetry={() => refetch()} />
    }

    const { groupScore, scoreDetail, strengths, members, pairs } = data
    const penalties = Object.entries(scoreDetail?.penalties ?? {})
    const nicknameOf = (applicationId: string) => members.find((m) => m.applicationId === applicationId)?.nickname ?? '알 수 없음'
    const pairName = (pair: DiningPairScore) => `${nicknameOf(pair.a)} · ${nicknameOf(pair.b)}`
    const sortedPairs = [...pairs].sort((x, y) => y.score - x.score)
    const selected = pairs.find((p) => pairKey(p) === selectedKey)
    const selectedCriteria = selected ? CRITERIA.filter((c) => selected.components[c] !== undefined) : []

    return (
      <>
        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-sm text-tag-text">그룹 점수</span>
            <span className="text-2xl font-bold text-primary">{groupScore === null ? '-' : percent(groupScore)}</span>
            {scoreDetail && (
              <span className="text-xs text-tag-text">쌍 평균 {percent(scoreDetail.pairAvg)} · 쌍 최저 {percent(scoreDetail.pairMin)}</span>
            )}
          </div>
          {strengths.length > 0 && (
            <ul className="flex flex-col gap-1">
              {strengths.map((s) => (
                <li key={s} className="rounded-input bg-primary-light px-3 py-2 text-sm font-medium text-primary">{s}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-tag-text">
            {penalties.length === 0 ? '감점 없음' : penalties.map(([key, value]) => `감점 ${key} ${value.toFixed(2)}`).join(' · ')}
          </p>
        </section>

        <DiningMatchGraph members={members} pairs={pairs} selectedKey={selectedKey} onSelect={setSelectedKey} />

        <div aria-live="polite" className={`rounded-input bg-tag-bg px-4 py-3 text-sm ${selected ? '' : 'hidden'}`}>
          {!selected ? (
            null
          ) : (
            <>
              <p className="font-bold text-foreground">
                {pairName(selected)} <span className="text-primary">{percent(selected.score)}</span>
              </p>
              {selectedCriteria.length === 0 ? (
                <p className="mt-1 text-tag-text">비교할 항목이 없어요.</p>
              ) : (
                <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
                  {selectedCriteria.map((c) => (
                    <div key={c} className="flex justify-between gap-2">
                      <dt className="text-tag-text">{CRITERION_LABEL[c]}</dt>
                      <dd className="font-semibold text-foreground">{percent(selected.components[c] ?? 0)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          )}
        </div>

        {sortedPairs.length === 0 ? (
          <p className="text-center text-sm text-tag-text">비교할 쌍이 없어요.</p>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">쌍별 점수, 높은 순</caption>
            <thead>
              <tr className="border-b border-tag-bg text-left text-xs text-tag-text">
                <th scope="col" className="px-2 py-1.5 font-medium">쌍</th>
                <th scope="col" className="px-2 py-1.5 text-right font-medium">점수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tag-bg">
              {sortedPairs.map((pair) => {
                const key = pairKey(pair)
                const isSelected = key === selectedKey
                return (
                  <tr key={key} className={isSelected ? 'bg-primary-light' : ''}>
                    <td className="py-0.5">
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedKey(key)}
                        className="w-full rounded-input px-2 py-1.5 text-left text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {pairName(pair)}
                      </button>
                    </td>
                    <td className="px-2 py-0.5 text-right font-semibold text-foreground">{percent(pair.score)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <section>
          <h4 className="mb-2 text-sm font-bold text-foreground">멤버별 응답 원문</h4>
          <ul className="flex flex-col gap-2">
            {members.map((m) => {
              const profile = [
                m.job,
                m.birthYear && `${dayjs().year() - m.birthYear}세`,
                m.gender && genderShort(m.gender),
                m.mbti,
              ].filter(Boolean).join(' · ')
              return (
                <li key={m.applicationId}>
                  <details className="rounded-input border border-tag-bg">
                    <summary className="cursor-pointer px-3 py-2 text-sm">
                      <span className="font-semibold text-foreground">{m.nickname}</span>
                      {profile && <span className="ml-2 text-xs text-tag-text">{profile}</span>}
                    </summary>
                    {m.answers.length === 0 ? (
                      <p className="px-3 pb-3 text-xs text-tag-text">응답이 없어요.</p>
                    ) : (
                      <dl className="flex flex-col gap-2 px-3 pb-3 text-sm">
                        {m.answers.map((answer, i) => (
                          <div key={i}>
                            <dt className="text-xs text-tag-text">{answer.label}</dt>
                            <dd className="whitespace-pre-line text-foreground">{answer.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </details>
                </li>
              )
            })}
          </ul>
        </section>
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dining-explanation-title"
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-card bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-tag-bg px-5 py-4">
          <h3 id="dining-explanation-title" className="text-base font-bold text-foreground">
            매칭 근거 · {tableLabel(tableId)}{data?.region ? ` · ${data.region}` : ''}
          </h3>
          <button type="button" onClick={onClose} className="text-tag-text hover:text-foreground" aria-label="닫기">
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4">{renderBody()}</div>
      </div>
    </div>
  )
}
