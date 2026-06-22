// 스토리형 캐러셀이 연결되는 정적 소개 페이지 콘텐츠. (KAN-254)
// 백엔드 carousel_slides에는 링크/슬러그 필드가 없으므로, STORY 슬라이드의 title을
// matchTitles로 매핑해 해당 정적 페이지(/story/{slug})로 이동시킨다.
// 새 스토리를 추가하려면 이 배열에 항목을 추가하면 정적 페이지가 자동 생성된다.

export interface StoryContent {
  slug: string
  /** STORY 슬라이드 title과 매칭할 후보들 (BE 링크 필드 부재로 제목 기반 매핑) */
  matchTitles: string[]
  /** 메시지 카탈로그 키 */
  messageKey: 'whatsupHouse'
  /** 대표 이미지 (public 경로) */
  heroImage: string
}

export const STORIES: StoryContent[] = [
  {
    slug: 'whatsup-house',
    matchTitles: ['와썹하우스 이야기', '와썹하우스'],
    messageKey: 'whatsupHouse',
    heroImage: '/assets/host-1.jpg',
  },
]

export function findStoryByTitle(title: string): StoryContent | undefined {
  const normalized = title.trim()
  return STORIES.find((story) => story.matchTitles.includes(normalized))
}

export function getStoryBySlug(slug: string): StoryContent | undefined {
  return STORIES.find((story) => story.slug === slug)
}
