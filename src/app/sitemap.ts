import type { MetadataRoute } from 'next'
import { fetchGatheringsAll } from '@/lib/api/gathering'
import { STORIES } from '@/lib/constants/stories'
import { SITE_URL } from '@/lib/constants/site'

// 1시간마다 다시 만든다 — 새 게더링이 사이트맵에 반영되도록.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // API가 죽어도 정적 페이지 사이트맵은 내보낸다.
  const gatherings = await fetchGatheringsAll().catch(() => [])

  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/gatherings`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/reviews`, changeFrequency: 'weekly', priority: 0.6 },
    ...STORIES.map((story) => ({ url: `${SITE_URL}/story/${story.slug}`, priority: 0.7 })),
    ...gatherings.map((gathering) => ({ url: `${SITE_URL}/gatherings/${gathering.id}`, priority: 0.8 })),
  ]
}
