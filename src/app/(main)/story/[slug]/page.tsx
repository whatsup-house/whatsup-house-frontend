import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { STORIES, getStoryBySlug } from '@/lib/constants/stories'

interface StoryPageProps {
  params: Promise<{ slug: string }>
}

// 스토리별 정적 페이지를 빌드 타임에 프리렌더한다 (SEO/AEO). (KAN-254)
export function generateStaticParams() {
  return STORIES.map((story) => ({ slug: story.slug }))
}

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const story = getStoryBySlug(slug)
  if (!story) return { title: '소개 | 와썹하우스' }

  return {
    title: `${story.title} | 와썹하우스`,
    description: story.description,
    openGraph: {
      title: story.title,
      description: story.description,
      type: 'article',
      images: [{ url: story.heroImage }],
    },
  }
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { slug } = await params
  const story = getStoryBySlug(slug)
  if (!story) notFound()

  // AEO용 구조화 데이터 (Article)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: story.title,
    description: story.description,
    image: story.heroImage,
    author: { '@type': 'Organization', name: '와썹하우스' },
    publisher: { '@type': 'Organization', name: '와썹하우스' },
  }

  return (
    <article className="bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 히어로 */}
      <div className="relative aspect-[390/260] w-full overflow-hidden bg-tag-bg">
        <Image
          src={story.heroImage}
          alt={story.title}
          fill
          priority
          sizes="(max-width: 430px) 100vw, 430px"
          className="object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-5 pb-5 pt-12">
          {story.tagline && (
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-white/85">
              {story.tagline}
            </p>
          )}
          <h1 className="text-2xl font-bold leading-tight text-white">{story.title}</h1>
        </div>
      </div>

      {/* 본문 */}
      <div className="px-5 py-6">
        <p className="text-sm leading-relaxed text-tag-text">{story.description}</p>

        <div className="mt-6 flex flex-col gap-6">
          {story.sections.map((section) => (
            <section key={section.heading}>
              <div className="mb-2 flex items-center gap-2">
                <div className="h-5 w-1 rounded-full bg-primary" />
                <h2 className="text-base font-bold text-foreground">{section.heading}</h2>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-tag-text">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <Link
          href="/gatherings"
          className="mt-8 flex min-h-[52px] w-full items-center justify-center rounded-button bg-primary px-5 text-[15px] font-bold text-white"
        >
          게더링 둘러보기
        </Link>
      </div>
    </article>
  )
}
