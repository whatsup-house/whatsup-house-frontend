interface Review {
  img: string
  nick: string
  mbti: string
  text: string
}

const REVIEWS: Review[] = [
  { img: '/home/home-1.png', nick: '재즈러버',     mbti: 'INFP', text: '오랜만에 깊은 대화를 나눴어요. 또 가고 싶어요!' },
  { img: '/home/home-3.png', nick: '민트초코',     mbti: 'ENFP', text: '생각보다 분위기가 너무 편해서 놀랐습니다 ☺️' },
  { img: '/home/home-4.png', nick: '골목길고양이', mbti: 'ISFJ', text: '이번에 처음 참여했는데 다음에 또 와요!' },
  { img: '/home/home-5.png', nick: '밤산책',       mbti: 'INTJ', text: '퇴근하고 가볍게 다녀오기 딱 좋네요.' },
]

import Link from 'next/link'

export default function ReviewsSection() {
  return (
    <div className="pt-2 pb-6">
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-[18px] rounded-full bg-primary" />
          <span className="text-[15px] font-bold text-foreground">다녀온 사람들의 후기</span>
        </div>
        <Link href="/reviews" className="text-xs text-tag-text/70 min-h-[36px] flex items-center">
          전체보기 ›
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4">
        {REVIEWS.map((review, i) => (
          <div
            key={i}
            className="flex-none w-[200px] bg-card rounded-2xl border border-tag-bg/40 overflow-hidden snap-start"
          >
            <div className="relative w-full aspect-square bg-tag-bg">
              <img
                src={review.img}
                alt={review.nick}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-5 h-5 rounded-full bg-tag-bg flex items-center justify-center text-[11px]">
                  🐻
                </div>
                <span className="text-[11px] font-semibold text-tag-text">{review.nick}</span>
                <span className="text-[9px] font-semibold text-primary bg-primary-light rounded px-1 py-0.5">
                  {review.mbti}
                </span>
              </div>
              <p className="text-xs text-tag-text leading-relaxed line-clamp-2">{review.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
