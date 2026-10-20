import { useMemo } from 'react'
import { useJobs } from './useJobs'
import ko from '../../../messages/ko.json'

const KO_JOB_LABELS: Record<string, string> = ko.jobs.item

// 직업 코드 → 한글 라벨. 관리자 화면은 한국어 전용이라 사용자 locale과 무관하게 ko 메시지를 쓴다.
// ko에 없는 코드는 BE 카탈로그 라벨로, 그래도 없으면(예전 자유 입력 등) 원본 값을 그대로 보여준다. (KAN-415)
export function useJobLabel() {
  const { data: groups } = useJobs()
  const catalog = useMemo(() => {
    const map: Record<string, string> = {}
    groups?.forEach((g) => g.jobs.forEach((j) => { map[j.code] = j.label }))
    return map
  }, [groups])

  return (job?: string | null) => {
    if (!job) return null
    return KO_JOB_LABELS[job] ?? catalog[job] ?? job
  }
}
