import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useJobs } from './useJobs'
import type { JobGroup } from '@/lib/api/types'

// 직업 카탈로그는 BE에서 code로 받고, 라벨은 FE messages(jobs.*)로 현지화한다. (KAN-300)
// 번역 키가 없으면 BE가 내려준 라벨(한국어)로 폴백한다.
export function useLocalizedJobs() {
  const query = useJobs()
  const t = useTranslations('jobs')

  const data = useMemo<JobGroup[] | undefined>(() => {
    if (!query.data) return query.data
    return query.data.map((group) => ({
      ...group,
      categoryLabel: t.has(`category.${group.category}`)
        ? t(`category.${group.category}`)
        : group.categoryLabel,
      jobs: group.jobs.map((job) => ({
        ...job,
        label: t.has(`item.${job.code}`) ? t(`item.${job.code}`) : job.label,
      })),
    }))
  }, [query.data, t])

  return { ...query, data }
}
