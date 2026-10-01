const MBTI_ROWS = [
  ['E', 'S', 'F', 'J'],
  ['I', 'N', 'T', 'P'],
] as const

interface MbtiSelectorProps {
  /** 4칸(E/I, S/N, F/T, J/P) 선택값. 미선택 칸은 null */
  value: (string | null)[]
  onSelect: (colIndex: number, letter: string) => void
  /** 4칸이 모두 선택됐을 때 아래에 보여줄 문구 (예: "ENFP 이시군요!") */
  resultText?: string
}

/** 온보딩·프로필 수정·신청 폼이 공통으로 쓰는 MBTI 4토글 */
export default function MbtiSelector({ value, onSelect, resultText }: MbtiSelectorProps) {
  const isComplete = value.length === 4 && value.every((v) => v !== null)

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {MBTI_ROWS.map((row) =>
          row.map((letter, colIndex) => {
            const active = value[colIndex] === letter
            return (
              <button
                key={letter}
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(colIndex, letter)}
                className={`py-3 rounded-input text-sm font-bold transition-colors min-h-[44px] ${
                  active ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text'
                }`}
              >
                {letter}
              </button>
            )
          }),
        )}
      </div>
      {isComplete && resultText && (
        <p className="text-center text-sm text-primary font-medium mt-2">{resultText}</p>
      )}
    </div>
  )
}
