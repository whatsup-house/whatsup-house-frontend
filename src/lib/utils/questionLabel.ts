// 어드민이 라벨에 직접 적은 '(복수 선택)'·'(복수 선택 가능)'·'(중복 선택 가능)'·'(복수 체크)' 류 표기.
// 줄 끝에 붙은 것만 대상이라 '직업 (구체적으로)' 같은 중간 괄호나 줄바꿈 뒤 안내문은 그대로 둔다. (KAN-387)
const MULTI_CHOICE_MARKER = /\s*[(（]\s*(?:복수|중복|다중)\s*(?:선택|체크|응답)?\s*(?:가능)?\s*[)）][ \t]*$/gm

// 복수 선택 질문은 FE 가 통일 문구를 따로 붙이므로 라벨 속 기존 표기는 뗀다.
export function stripMultiChoiceMarker(label: string): string {
  return label.replace(MULTI_CHOICE_MARKER, '').trim()
}
