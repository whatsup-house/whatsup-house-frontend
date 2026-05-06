import { Flame } from 'lucide-react'

interface CuratedItem {
  rank: number
  title: string
  sub: string
  img: string
}

const ITEMS: CuratedItem[] = [
  { rank: 1, title: '전국 대학생 게더링', sub: '5월 21일 수', img: '/home/home-1.png' },
  { rank: 2, title: '경찰과 도둑',         sub: '5월 11일 일', img: '/home/home-3.png' },
  { rank: 3, title: '퇴근 게더링',         sub: '5월 1·2일',  img: '/home/home-5.png' },
]

export default function CuratedSection() {
  return (
    <div className="px-4 pt-5 pb-2">
      <div className="flex items-center gap-2 mb-3">
        <Flame size={14} className="text-primary fill-primary" strokeWidth={0} />
        <span className="text-[15px] font-bold text-foreground">이번 주 가장 많이 본 게더링</span>
      </div>
      <div className="flex flex-col gap-3">
        {ITEMS.map((item) => (
          <div
            key={item.rank}
            className="flex items-center gap-3 bg-card rounded-2xl p-2.5 border border-tag-bg/40"
          >
            <span
              className={`w-7 text-center text-lg font-bold flex-shrink-0 ${
                item.rank === 1 ? 'text-primary' : 'text-tag-text'
              }`}
            >
              {item.rank}
            </span>
            <div className="relative w-12 h-12 flex-shrink-0 bg-tag-bg rounded-xl overflow-hidden">
              <img
                src={item.img}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
              <p className="text-[11px] text-tag-text/70 mt-0.5">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
