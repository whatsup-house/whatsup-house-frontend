'use client'

import { useState } from 'react'
import dayjs from 'dayjs'
import { X } from 'lucide-react'
import type { DiningCriterion, DiningExplanationMember, DiningPairScore } from '@/lib/api/types'
import { useDiningTableExplanation } from '@/lib/hooks/useAdminDining'
import { genderShort, tableLabel } from '@/lib/utils/diningStatus'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'
import { GRAPH_SIZE, LABEL_H, LABEL_W, NICKNAME_DY, NODE_H, NODE_W, circleLayout, placePairLabels } from '@/lib/utils/diningGraph'
import { ApiErrorMessage, LoadingSpinner } from '@/components/ui'

// characterUrl 이 없거나 이미지 로드에 실패하면 기본 캐릭터 (MyProfile 과 같은 폴백, KAN-285)
const FALLBACK_CHARACTER = '/assets/job/DEFAULT_SUIT.png'

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
const pairKey = (pair: Pick<DiningPairScore, 'a' | 'b'>) => `${pair.a}:${pair.b}`

interface GraphNodeProps {
  x: number
  y: number
  nickname: string
  characterUrl: string | null
}

function GraphNode({ x, y, nickname, characterUrl }: GraphNodeProps) {
  const [src, setSrc] = useState(characterUrl || FALLBACK_CHARACTER)
  return (
    <g>
      {/* 선 끝을 가리는 배경 */}
      <rect x={x - NODE_W / 2 - 2} y={y - NODE_H / 2 - 2} width={NODE_W + 4} height={NODE_H + 4} rx={12} className="fill-card stroke-tag-bg" />
      <image
        href={src}
        x={x - NODE_W / 2}
        y={y - NODE_H / 2}
        width={NODE_W}
        height={NODE_H}
        preserveAspectRatio="xMidYMid meet"
        onError={() => {
          if (src !== FALLBACK_CHARACTER) setSrc(FALLBACK_CHARACTER)
        }}
      />
      <text
        x={x}
        y={y + NICKNAME_DY}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        strokeWidth={4}
        paintOrder="stroke"
        className="fill-foreground stroke-card"
      >
        {nickname}
      </text>
    </g>
  )
}

interface MatchGraphProps {
  members: Pick<DiningExplanationMember, 'applicationId' | 'nickname' | 'characterUrl'>[]
  pairs: DiningPairScore[]
  selectedKey: string | null
  onSelect: (key: string) => void
}

// 멤버를 원형으로 놓고 모든 쌍을 잇는다. 선 굵기·진하기 = 쌍 점수, 선 위 라벨 = %.
// 마우스 전용이라 스크린리더에서는 숨기고, 같은 선택을 아래 쌍 목록 표에서 키보드로 한다.
function MatchGraph({ members, pairs, selectedKey, onSelect }: MatchGraphProps) {
  const nodes = circleLayout(members.length)
  const indexOf = new Map(members.map((m, i) => [m.applicationId, i]))
  const edges = pairs.flatMap((pair) => {
    const a = indexOf.get(pair.a)
    const b = indexOf.get(pair.b)
    return a === undefined || b === undefined ? [] : [{ pair, key: pairKey(pair), ends: [a, b] as [number, number] }]
  })
  const labels = placePairLabels(nodes, edges.map((e) => e.ends))

  return (
    <svg viewBox={`0 0 ${GRAPH_SIZE} ${GRAPH_SIZE}`} className="mx-auto w-full max-w-sm" aria-hidden="true" focusable="false">
      {edges.map(({ pair, key, ends: [a, b] }) => {
        const selected = key === selectedKey
        const line = { x1: nodes[a].x, y1: nodes[a].y, x2: nodes[b].x, y2: nodes[b].y }
        return (
          <g key={key} onClick={() => onSelect(key)} className="cursor-pointer">
            <line
              {...line}
              strokeLinecap="round"
              strokeWidth={1 + pair.score * 5}
              strokeOpacity={selected ? 1 : 0.2 + pair.score * 0.8}
              className={selected ? 'stroke-foreground' : 'stroke-primary'}
            />
            {/* 얇은 선도 누르기 쉽게 넓은 투명 히트 영역 */}
            <line {...line} strokeWidth={14} className="stroke-transparent" />
          </g>
        )
      })}
      {members.map((m, i) => (
        <GraphNode
          key={`${m.applicationId}:${m.characterUrl ?? ''}`}
          x={nodes[i].x}
          y={nodes[i].y}
          nickname={m.nickname}
          characterUrl={m.characterUrl}
        />
      ))}
      {edges.map(({ pair, key }, i) => {
        const selected = key === selectedKey
        return (
          <g key={`label-${key}`} onClick={() => onSelect(key)} className="cursor-pointer">
            <rect
              x={labels[i].x - LABEL_W / 2}
              y={labels[i].y - LABEL_H / 2}
              width={LABEL_W}
              height={LABEL_H}
              rx={LABEL_H / 2}
              className={selected ? 'fill-foreground stroke-foreground' : 'fill-card stroke-primary'}
            />
            <text
              x={labels[i].x}
              y={labels[i].y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fontWeight={700}
              className={selected ? 'fill-card' : 'fill-foreground'}
            >
              {percent(pair.score)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

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

        <MatchGraph members={members} pairs={pairs} selectedKey={selectedKey} onSelect={setSelectedKey} />

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
