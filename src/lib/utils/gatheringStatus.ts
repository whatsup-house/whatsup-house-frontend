import dayjs from 'dayjs'
import type { GatheringStatus } from '@/lib/api/types'

// 백엔드 effective status(KAN-163)와 동일한 규칙의 프론트 fallback 보정. (KAN-164)
// eventDate가 오늘보다 과거인 모집중(OPEN) 게더링은 진행 완료(COMPLETED)로 간주한다.
// CANCELLED / CLOSED / COMPLETED 등 명시적 상태는 그대로 유지한다.
export function getEffectiveStatus(status: GatheringStatus, eventDate: string): GatheringStatus {
  if (status === 'OPEN' && eventDate < dayjs().format('YYYY-MM-DD')) {
    return 'COMPLETED'
  }
  return status
}
