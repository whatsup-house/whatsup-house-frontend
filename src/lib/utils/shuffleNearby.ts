// 최신순 큰 흐름은 유지하고 가까운 몇 칸끼리만 섞는다 (항목이 최대 spread 칸 안에서 움직임).
// 항목별 난수는 jitter 에 기억해 두므로 리렌더·다음 페이지 로드에도 이미 보인 순서는 바뀌지 않는다.
export function shuffleNearby<T extends { id: string }>(items: T[], jitter: Map<string, number>, spread = 5): T[] {
  return items
    .map((item, i) => {
      if (!jitter.has(item.id)) jitter.set(item.id, Math.random())
      return { item, key: i + jitter.get(item.id)! * spread }
    })
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item)
}
