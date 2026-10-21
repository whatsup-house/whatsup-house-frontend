'use client'

import { useState } from 'react'
import type { DiningExplanationMember, DiningPairScore } from '@/lib/api/types'
import { GRAPH_SIZE, LABEL_H, LABEL_W, NICKNAME_DY, NODE_H, NODE_W, circleLayout, placePairLabels } from '@/lib/utils/diningGraph'

// characterUrl 이 없거나 이미지 로드에 실패하면 기본 캐릭터 (MyProfile 과 같은 폴백, KAN-285)
const FALLBACK_CHARACTER = '/assets/job/DEFAULT_SUIT.png'

const percent = (value: number) => `${Math.round(value * 100)}%`
export const pairKey = (pair: Pick<DiningPairScore, 'a' | 'b'>) => `${pair.a}:${pair.b}`

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

interface DiningMatchGraphProps {
  members: Pick<DiningExplanationMember, 'applicationId' | 'nickname' | 'characterUrl'>[]
  pairs: DiningPairScore[]
  selectedKey?: string | null
  onSelect?: (key: string) => void // 없으면 보기 전용(테이블 궁합 카드) — 선·라벨을 눌러도 아무 일 없다
}

// 직업 캐릭터 궁합 그래프 (KAN-434, KAN-441에서 분리). 멤버를 원형으로 놓고 모든 쌍을 잇는다. 선 굵기·진하기 = 쌍 점수, 선 위 라벨 = %.
// 마우스 전용이라 스크린리더에서는 숨긴다. 근거 모달에서는 같은 선택을 쌍 목록 표에서 키보드로 한다.
export default function DiningMatchGraph({ members, pairs, selectedKey = null, onSelect }: DiningMatchGraphProps) {
  const nodes = circleLayout(members.length)
  const indexOf = new Map(members.map((m, i) => [m.applicationId, i]))
  const edges = pairs.flatMap((pair) => {
    const a = indexOf.get(pair.a)
    const b = indexOf.get(pair.b)
    return a === undefined || b === undefined ? [] : [{ pair, key: pairKey(pair), ends: [a, b] as [number, number] }]
  })
  const labels = placePairLabels(nodes, edges.map((e) => e.ends))
  const selectProps = (key: string) => (onSelect ? { onClick: () => onSelect(key), className: 'cursor-pointer' } : {})

  return (
    // shrink-0: 근거 모달처럼 내용이 넘치는 flex 열에서 높이가 0으로 줄어들지 않게
    <svg viewBox={`0 0 ${GRAPH_SIZE} ${GRAPH_SIZE}`} className="mx-auto w-full max-w-sm shrink-0" aria-hidden="true" focusable="false">
      {edges.map(({ pair, key, ends: [a, b] }) => {
        const selected = key === selectedKey
        const line = { x1: nodes[a].x, y1: nodes[a].y, x2: nodes[b].x, y2: nodes[b].y }
        return (
          <g key={key} {...selectProps(key)}>
            <line
              {...line}
              strokeLinecap="round"
              strokeWidth={1 + pair.score * 5}
              strokeOpacity={selected ? 1 : 0.2 + pair.score * 0.8}
              className={selected ? 'stroke-foreground' : 'stroke-primary'}
            />
            {/* 얇은 선도 누르기 쉽게 넓은 투명 히트 영역 */}
            {onSelect && <line {...line} strokeWidth={14} className="stroke-transparent" />}
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
          <g key={`label-${key}`} {...selectProps(key)}>
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
