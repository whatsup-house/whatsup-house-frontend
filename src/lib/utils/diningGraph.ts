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

// 라벨 후보 위치(선 위 비율 0.2~0.8): 중앙에서 시작해 양 끝 쪽으로 번갈아 넓혀 간다. 점수가 같으면 앞(중앙 쪽)이 이긴다.
const T_CANDIDATES = [0.5, ...Array.from({ length: 30 }, (_, i) => 0.5 + (i % 2 ? -1 : 1) * 0.02 * (Math.floor(i / 2) + 1))]

const overlaps = (a: Box, b: Box) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 + GAP && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + GAP

// 라벨 박스(c 중심)와 선분 ab 사이 여유. 음수면 선이 박스를 지난다(라벨에 가려 어느 선 숫자인지 헷갈린다).
// 선분 위 최근접점 방향으로 박스가 뻗는 길이를 뺀다 — 실제 거리보다 작거나 같아서 양수면 확실히 안 겹친다.
export function labelClearance(c: GraphPoint, a: GraphPoint, b: GraphPoint): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.y - a.y) * dy) / (dx * dx + dy * dy)))
  const ux = a.x + dx * t - c.x
  const uy = a.y + dy * t - c.y
  const d = Math.hypot(ux, uy)
  if (d === 0) return -LABEL_W / 2
  return d - ((LABEL_W / 2) * Math.abs(ux) + (LABEL_H / 2) * Math.abs(uy)) / d
}

// 다른 선들과 이만큼(px) 떨어지면 충분하다 — 그 이상은 같은 점수로 보고 선 중앙에 가까운 자리를 고른다
const ENOUGH_CLEARANCE = 12
// 여유 기준을 충분한 값부터 낮춰 가며 배치를 시도한다
const CLEARANCE_STEPS = [ENOUGH_CLEARANCE, 8, 4, 0, -4, -8]

// 쌍 % 라벨 위치. 자기 선 위 후보 중 다른 라벨·노드(이미지+닉네임)와 겹치지 않는 곳에서 다른 선들과의 여유가 가장 큰 곳을 고른다
// — 교차점이나 다른 선 바로 옆에 숫자가 놓이지 않게. 여유가 충분하면 선 중앙 쪽. 결정적이다.
// 놓을 자리가 가장 적게 남은 라벨부터 놓고(같으면 긴 선), 누군가 기준을 못 채우면 기준을 낮춰 처음부터 다시 한다.
// 라벨마다 기준은 min(기준, 혼자일 때 최선) — 원래 빡빡한 선 하나 때문에 다른 라벨까지 기준이 내려가지 않게.
// 6명 전체 쌍은 가로 짧은 대각선 둘이 어디에 둬도 다른 선에 2~3px 걸린다(전수 탐색 최적값 -3.3px과 같다).
// ponytail: 탐욕 배치라 2~6명 전체 쌍·부분 쌍으로만 확인했다. 7명 이상을 다루면 라벨 크기·반지름을 키우거나 배치를 다시 짠다.
export function placePairLabels(nodes: GraphPoint[], pairs: [number, number][]): GraphPoint[] {
  // 노드 영역: 이미지 위쪽 끝 ~ 닉네임 아래쪽 끝, 닉네임 폭은 대략 68
  const top = -NODE_H / 2
  const bottom = NICKNAME_DY + 6
  const nodeBoxes: Box[] = nodes.map((n) => ({ x: n.x, y: n.y + (top + bottom) / 2, w: 68, h: bottom - top }))
  const labelBox = (pt: GraphPoint): Box => ({ ...pt, w: LABEL_W, h: LABEL_H })
  const fits = (pt: GraphPoint, placed: Box[]) => !placed.some((box) => overlaps(box, labelBox(pt)))
  const candidates = pairs.map(([a, b], i) =>
    T_CANDIDATES.map((t) => {
      const pt = { x: nodes[a].x + (nodes[b].x - nodes[a].x) * t, y: nodes[a].y + (nodes[b].y - nodes[a].y) * t }
      const clear = pairs.reduce((min, [c, d], j) => (j === i ? min : Math.min(min, labelClearance(pt, nodes[c], nodes[d]))), GRAPH_SIZE)
      return { pt, clear }
    }),
  )
  const bestAlone = candidates.map((cs) => Math.max(-Infinity, ...cs.filter((c) => fits(c.pt, nodeBoxes)).map((c) => c.clear)))
  const length = ([a, b]: [number, number]) => Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y)
  const order = pairs.map((_, i) => i).sort((i, j) => length(pairs[j]) - length(pairs[i]))

  // 기준을 못 채우는 라벨이 생기면 null. 기준이 -Infinity 면 끝까지 놓는다(자리가 없으면 겹치더라도 여유가 큰 쪽).
  const attempt = (threshold: number): GraphPoint[] | null => {
    const placed = [...nodeBoxes]
    const result: GraphPoint[] = new Array(pairs.length)
    const todo = [...order]
    while (todo.length > 0) {
      const free = todo.map((i) => candidates[i].filter((c) => c.clear >= Math.min(threshold, bestAlone[i]) && fits(c.pt, placed)))
      const k = free.reduce((min, f, idx) => (f.length < free[min].length ? idx : min), 0)
      if (free[k].length === 0 && threshold > -Infinity) return null
      const [i] = todo.splice(k, 1)
      // 후보는 중앙부터 나열돼 있어 같은 점수면 중앙 쪽이 남는다. 0.01 미만 차이는 같은 점수(대칭 배치의 부동소수 오차)
      const score = (c: { clear: number }) => Math.min(c.clear, ENOUGH_CLEARANCE)
      const pick = (free[k].length > 0 ? free[k] : candidates[i]).reduce((best, c) => (score(c) > score(best) + 0.01 ? c : best))
      placed.push(labelBox(pick.pt))
      result[i] = pick.pt
    }
    return result
  }
  for (const threshold of CLEARANCE_STEPS) {
    const result = attempt(threshold)
    if (result) return result
  }
  return attempt(-Infinity) ?? []
}
