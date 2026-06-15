// 스토리형 캐러셀이 연결되는 정적 소개 페이지 콘텐츠. (KAN-254)
// 백엔드 carousel_slides에는 링크/슬러그 필드가 없으므로, STORY 슬라이드의 title을
// matchTitles로 매핑해 해당 정적 페이지(/story/{slug})로 이동시킨다.
// 새 스토리를 추가하려면 이 배열에 항목을 추가하면 정적 페이지가 자동 생성된다.

export interface StorySection {
  heading: string
  body: string
}

export interface StoryContent {
  slug: string
  /** STORY 슬라이드 title과 매칭할 후보들 (BE 링크 필드 부재로 제목 기반 매핑) */
  matchTitles: string[]
  /** 상단 라벨 (선택) */
  tagline?: string
  /** 페이지 제목 및 메타 title */
  title: string
  /** 메타 description + 본문 리드 문단 */
  description: string
  /** 대표 이미지 (public 경로) */
  heroImage: string
  sections: StorySection[]
}

export const STORIES: StoryContent[] = [
  {
    slug: 'whatsup-house',
    matchTitles: ['와썹하우스 이야기', '와썹하우스'],
    tagline: '우리가 만드는 공간',
    title: '와썹하우스 이야기',
    description:
      '와썹하우스는 혼자 사는 2030 청년이 부담 없이 모일 수 있도록, 대표가 직접 기획하고 운영하는 소규모 오프라인 게더링 플랫폼입니다.',
    heroImage: '/assets/host-1.jpg',
    sections: [
      {
        heading: '와썹하우스는요',
        body: '혼자여도 외롭지 않은 저녁을 만들고 싶었어요. 와썹하우스는 1인 가구 2030 청년을 위한 오프라인 소셜 게더링 플랫폼입니다. 가볍게 만나 취향과 일상을 나누는 자리를 이어갑니다.',
      },
      {
        heading: '이런 게더링을 만들어요',
        body: '모든 게더링은 와썹하우스가 직접 주최하고 운영해요. 한 번에 최대 20명까지, 늘 소규모로 진행해 처음 오신 분도 자연스럽게 어울릴 수 있어요.',
      },
      {
        heading: '이렇게 참여해요',
        body: '마음에 드는 게더링을 둘러보고 신청만 하면 끝. 복잡한 매칭 없이, 원하는 날짜의 모임에 가볍게 합류하세요.',
      },
    ],
  },
]

export function findStoryByTitle(title: string): StoryContent | undefined {
  const normalized = title.trim()
  return STORIES.find((story) => story.matchTitles.includes(normalized))
}

export function getStoryBySlug(slug: string): StoryContent | undefined {
  return STORIES.find((story) => story.slug === slug)
}
