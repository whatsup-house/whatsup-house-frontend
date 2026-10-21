// 매칭 근거 그래프 배치 (KAN-434). 좌표는 SVG viewBox 기준이다.
export const GRAPH_SIZE = 400
const RADIUS = 135
// 직업 캐릭터 이미지(240x300 비율)와 그 아래 닉네임
export const NODE_W = 48
export const NODE_H = 60
export const NICKNAME_DY = NODE_H / 2 + 14
export const LABEL_W = 38
export const LABEL_H = 18
const GAP = 2

export interface GraphPoint {
  x: number
  y: number
}

interface Box extends GraphPoint {
  w: number
  h: number
}

// 12시 방향부터 시계 방향으로 원 위에 고르게 놓는다.
export function circleLayout(count: number): GraphPoint[] {
  const center = GRAPH_SIZE / 2
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count
    return { x: center + RADIUS * Math.cos(angle), y: center + RADIUS * Math.sin(angle) }
  })
}

// 라벨 후보 위치(선 위 비율): 중앙에서 시작해 양 끝 쪽으로 번갈아 넓혀 간다.
const T_CANDIDATES = [0.5, ...Array.from({ length: 30 }, (_, i) => 0.5 + (i % 2 ? -1 : 1) * 0.02 * (Math.floor(i / 2) + 1))]

const overlaps = (a: Box, b: Box) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 + GAP && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + GAP

// 쌍 % 라벨 위치. 선 중앙이 기본이고, 다른 라벨·노드(이미지+닉네임)와 겹치면 선을 따라 옮긴다.
// 긴 선부터 놓는다 — 짝수 인원이면 지름들이 원 중심에서 겹치는데, 긴 선이 옮길 여지가 크다.
// ponytail: 탐욕 배치라 4~6명 기준으로만 겹침 없음을 확인했다. 8명 이상을 다루면 라벨 크기·반지름을 키우거나 배치를 다시 짠다.
export function placePairLabels(nodes: GraphPoint[], pairs: [number, number][]): GraphPoint[] {
  // 노드 영역: 이미지 위쪽 끝 ~ 닉네임 아래쪽 끝, 닉네임 폭은 대략 68
  const top = -NODE_H / 2
  const bottom = NICKNAME_DY + 6
  const placed: Box[] = nodes.map((n) => ({ x: n.x, y: n.y + (top + bottom) / 2, w: 68, h: bottom - top }))
  const length = ([a, b]: [number, number]) => Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y)
  const order = pairs.map((_, i) => i).sort((i, j) => length(pairs[j]) - length(pairs[i]))
  const result: GraphPoint[] = new Array(pairs.length)
  for (const i of order) {
    const [p, q] = [nodes[pairs[i][0]], nodes[pairs[i][1]]]
    const at = (t: number) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t })
    const fits = (pt: GraphPoint) => !placed.some((box) => overlaps(box, { ...pt, w: LABEL_W, h: LABEL_H }))
    const pos = T_CANDIDATES.map(at).find(fits) ?? at(0.5)
    placed.push({ ...pos, w: LABEL_W, h: LABEL_H })
    result[i] = pos
  }
  return result
}
