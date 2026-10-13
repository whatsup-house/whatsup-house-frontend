export type CarouselDot = 'active' | 'normal' | 'small'

// 인스타그램식 점: 5개 이하면 전부, 넘으면 5칸 창으로 보여주고 창 밖에 더 있는 쪽 끝 점을 작게.
// 처음·마지막 2장은 창이 끝에 붙고, 3번째·끝에서 3번째는 가운데 흰 점에 양옆이 일반 점, 그 사이는 '· ○ ● ○ ·'.
export function carouselDots(index: number, total: number): CarouselDot[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => (i === index ? 'active' : 'normal'))
  const last = total - 1
  if (index <= 1) return [0, 1, 2, 3].map((i): CarouselDot => (i === index ? 'active' : 'normal')).concat('small')
  if (index >= last - 1) return (['small'] as CarouselDot[]).concat([3, 2, 1, 0].map((i) => (last - i === index ? 'active' : 'normal')))
  if (index === 2 || index === last - 2) return ['normal', 'normal', 'active', 'normal', 'normal']
  return ['small', 'normal', 'active', 'normal', 'small']
}
