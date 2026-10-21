interface DiningRegionChipsProps {
  regions: string[]
  selected: string[]   // 고른 순서 = 지망
  label: string
  onToggle: (region: string) => void
}

// 우연한 식탁 희망 지역 지망 칩 — 신청 1단계·일정 바꾸기·대체 날짜 선택이 같이 쓴다 (KAN-433)
export default function DiningRegionChips({ regions, selected, label, onToggle }: DiningRegionChipsProps) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 gap-2">
      {regions.map((region) => {
        const priority = selected.indexOf(region) + 1
        const isSelected = priority > 0
        return (
          <button
            key={region}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onToggle(region)}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-input text-sm font-medium transition-colors min-h-[44px] ${
              isSelected ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
            }`}
          >
            {isSelected && (
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-primary">
                {priority}
              </span>
            )}
            {region}
          </button>
        )
      })}
    </div>
  )
}

// 지망 목록에서 빼거나 맨 뒤 지망으로 넣는다
export const toggleInOrder = (list: string[], item: string) =>
  list.includes(item) ? list.filter((value) => value !== item) : [...list, item]
