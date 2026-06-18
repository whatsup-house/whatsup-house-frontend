import { useQuery } from '@tanstack/react-query'
import { fetchJobs } from '@/lib/api/job'

// 직업 카탈로그는 거의 변하지 않는 정적 데이터라 길게 캐시한다. (KAN-270)
export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
    staleTime: 1000 * 60 * 60,
  })
}
