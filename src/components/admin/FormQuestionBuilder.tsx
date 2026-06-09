'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Lock, X, GripVertical } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  useAdminFormQuestions,
  useAddFormQuestion,
  useUpdateFormQuestion,
  useDeleteFormQuestion,
} from '@/lib/hooks/useForm'
import type {
  FormQuestionAdminItem,
  FormQuestionUpsertRequest,
  QuestionType,
  MatchingStrategy,
} from '@/lib/api/types'

const TYPE_LABEL: Record<QuestionType, string> = {
  SHORT_TEXT: '주관식',
  LONG_TEXT: '주관식',
  SINGLE_CHOICE: '단일선택',
  MULTI_CHOICE: '다중선택',
  NUMBER: '숫자',
  MBTI_INPUT: 'MBTI',
}

// 질문 추가/수정 드롭다운에 노출하는 유형. 단답형·장문형은 '주관식' 하나로 합쳤다.
// (레거시 LONG_TEXT 질문은 편집 시 SHORT_TEXT로 정규화된다.)
const TYPE_OPTIONS: QuestionType[] = ['SHORT_TEXT', 'SINGLE_CHOICE', 'MULTI_CHOICE', 'NUMBER', 'MBTI_INPUT']

const STRATEGY_LABEL: Record<MatchingStrategy, string> = {
  SAME: '비슷하게',
  DIVERSE: '다양하게',
  OVERLAP: '많이 겹치게',
}

const CHOICE_TYPES: QuestionType[] = ['SINGLE_CHOICE', 'MULTI_CHOICE']

// 매칭 프리셋 — 클릭하면 에디터가 채워진다. question_key는 매칭 엔진이 인식하는 값으로 고정.
interface Preset {
  name: string
  hint: string
  data: Partial<EditorState>
}
const PRESETS: Preset[] = [
  { name: '나이', hint: '나이 ±8 + 비슷한 나이 우대', data: { label: '나이', questionKey: 'age', type: 'NUMBER', isMatchingField: true, matchingStrategy: 'SAME' } },
  { name: '성별', hint: '성별 균형 맞추기', data: { label: '성별', questionKey: 'gender', type: 'SINGLE_CHOICE', choicesText: 'MALE\nFEMALE', isMatchingField: true, matchingStrategy: 'DIVERSE' } },
  { name: '직업', hint: '같은 직군 쏠림 방지', data: { label: '직업', questionKey: 'job_category', type: 'SINGLE_CHOICE', choicesText: '학생\n직장인\n프리랜서\n자영업', isMatchingField: true, matchingStrategy: 'DIVERSE' } },
  { name: 'MBTI', hint: '성향 다양성', data: { label: 'MBTI', questionKey: 'mbti', type: 'MBTI_INPUT', isMatchingField: true, matchingStrategy: 'DIVERSE' } },
  { name: '관심사', hint: '관심사 겹치는 사람끼리', data: { label: '관심사', questionKey: 'interests', type: 'MULTI_CHOICE', choicesText: '영화\n음악\n여행\n운동\n독서', isMatchingField: true, matchingStrategy: 'OVERLAP' } },
  { name: '예산', hint: '예산대 겹쳐야 같은 그룹 (하드 조건)', data: { label: '예산', questionKey: 'budget', type: 'MULTI_CHOICE', choicesText: '1만원\n2만원\n3만원', isMatchingField: false } },
  { name: '가능 날짜', hint: '날짜 겹쳐야 같은 그룹 (하드 조건)', data: { label: '가능 날짜', questionKey: 'available_dates', type: 'MULTI_CHOICE', choicesText: '2026-08-01\n2026-08-08', isMatchingField: false } },
]

const HARD_KEYS = ['budget', 'available_dates', 'age']

// 자유 질문용 안정 식별자. (KAN-191) question key는 화면에 노출하지 않으므로 자동 생성한다.
function autoQuestionKey(): string {
  return `q_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

function getDefaultMatchingStrategy(questionKey: string, type: QuestionType): MatchingStrategy {
  if (questionKey === 'age') return 'SAME'
  if (['gender', 'job_category', 'mbti'].includes(questionKey)) return 'DIVERSE'
  if (['interests', 'available_dates', 'budget'].includes(questionKey)) return 'OVERLAP'
  if (type === 'NUMBER') return 'SAME'
  if (type === 'MULTI_CHOICE') return 'OVERLAP'
  return 'DIVERSE'
}

interface FormQuestionBuilderProps {
  gatheringId: string
  gatheringTitle?: string
}

export default function FormQuestionBuilder({ gatheringId, gatheringTitle }: FormQuestionBuilderProps) {
  const { data: questions = [], isLoading } = useAdminFormQuestions(gatheringId)
  const deleteQuestion = useDeleteFormQuestion(gatheringId)
  const [editing, setEditing] = useState<FormQuestionAdminItem | 'new' | null>(null)

  const nextOrder = questions.length > 0 ? Math.max(...questions.map((q) => q.displayOrder)) + 1 : 0

  if (isLoading) {
    return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-[16px] text-[#1A1A1A]">
            {gatheringTitle ? `${gatheringTitle} — 신청폼` : '신청폼 질문'}
          </h2>
          <span className="px-3 py-1 bg-[#F5F0EB] rounded-full text-sm text-[#767676]">질문 {questions.length}개</span>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-input text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          질문 추가
        </button>
      </div>

      <div className="bg-white rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden">
        {questions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-medium text-[#1A1A1A] mb-1">질문이 없어요.</p>
            <p className="text-sm text-[#767676]">‘질문 추가’로 신청폼을 구성하세요. 매칭 질문은 위 프리셋을 쓰면 편해요.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0EBE8]">
            {questions.map((q) => (
              <div key={q.questionId} className="flex items-center gap-3 px-4 py-3 hover:bg-[#F5F0EB] transition-colors">
                <GripVertical size={16} className="text-[#CCC] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-medium text-[#1A1A1A]">{q.label}</span>
                    <span className="px-1.5 py-0.5 bg-[#F0EBE8] text-[#5C4033] rounded text-[11px]">{TYPE_LABEL[q.type]}</span>
                    {q.required && <span className="px-1.5 py-0.5 bg-[#FDECEA] text-[#C8392B] rounded text-[11px]">필수</span>}
                    {q.isMatchingField && q.matchingStrategy && (
                      <span className="px-1.5 py-0.5 bg-[#E8F5E9] text-[#4CAF50] rounded text-[11px]">
                        매칭·{STRATEGY_LABEL[q.matchingStrategy]}
                      </span>
                    )}
                    {q.systemReserved && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#E3F2FD] text-[#1976D2] rounded text-[11px]">
                        <Lock size={10} /> 기본
                      </span>
                    )}
                  </div>
                  <span className="text-[12px] text-[#999]">key: {q.questionKey}</span>
                </div>
                <button onClick={() => setEditing(q)} className="text-[#767676] hover:text-[#1A1A1A] p-1.5" title="수정">
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => {
                    if (q.systemReserved) { alert('기본 질문(이름/연락처)은 삭제할 수 없어요.'); return }
                    if (confirm(`'${q.label}' 질문을 삭제할까요?`)) deleteQuestion.mutate(q.questionId)
                  }}
                  className={`p-1.5 ${q.systemReserved ? 'text-[#DDD] cursor-not-allowed' : 'text-[#C8392B] hover:bg-[#FDECEA] rounded'}`}
                  title={q.systemReserved ? '삭제 불가' : '삭제'}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <QuestionEditorModal
          gatheringId={gatheringId}
          initial={editing === 'new' ? null : editing}
          nextOrder={nextOrder}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ─── 에디터 모달 ────────────────────────────────────────────────────────
interface EditorState {
  label: string
  questionKey: string
  type: QuestionType
  placeholder: string
  required: boolean
  choicesText: string
  isMatchingField: boolean
  matchingStrategy: MatchingStrategy | ''
  matchingWeight: number
}

interface QuestionEditorModalProps {
  gatheringId: string
  initial: FormQuestionAdminItem | null
  nextOrder: number
  onClose: () => void
}

function QuestionEditorModal({ gatheringId, initial, nextOrder, onClose }: QuestionEditorModalProps) {
  const addQuestion = useAddFormQuestion(gatheringId)
  const updateQuestion = useUpdateFormQuestion(gatheringId)
  const isEdit = !!initial

  const [state, setState] = useState<EditorState>(() => ({
    label: initial?.label ?? '',
    questionKey: initial?.questionKey ?? '',
    // 단답형·장문형을 '주관식'으로 합쳤으므로 레거시 LONG_TEXT는 SHORT_TEXT로 정규화한다.
    type: initial?.type === 'LONG_TEXT' ? 'SHORT_TEXT' : (initial?.type ?? 'SHORT_TEXT'),
    placeholder: initial?.placeholder ?? '',
    required: initial?.required ?? true,
    choicesText: (initial?.options?.choices ?? []).join('\n'),
    isMatchingField: initial?.isMatchingField ?? false,
    matchingStrategy: initial?.matchingStrategy ?? '',
    matchingWeight: initial?.matchingWeight ?? 1,
  }))
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof EditorState>(key: K, value: EditorState[K]) =>
    setState((p) => ({ ...p, [key]: value }))

  const handleTypeChange = (type: QuestionType) => {
    setState((p) => ({
      ...p,
      type,
      matchingStrategy: p.isMatchingField
        ? getDefaultMatchingStrategy(p.questionKey, type)
        : p.matchingStrategy,
    }))
  }

  const handleMatchingFieldChange = (isMatchingField: boolean) => {
    setState((p) => ({
      ...p,
      isMatchingField,
      matchingStrategy: isMatchingField && !p.matchingStrategy
        ? getDefaultMatchingStrategy(p.questionKey, p.type)
        : p.matchingStrategy,
    }))
  }

  const applyPreset = (preset: Preset) => {
    setState((p) => ({ ...p, placeholder: '', required: true, matchingWeight: 1, matchingStrategy: '', choicesText: '', ...preset.data }))
    setError(null)
  }

  const isChoice = CHOICE_TYPES.includes(state.type)
  const isHardKey = HARD_KEYS.includes(state.questionKey)

  const handleSave = () => {
    setError(null)
    if (!state.label.trim()) return setError('질문 라벨을 입력해주세요.')
    const choices = state.choicesText.split(/[\n,]/).map((c) => c.trim()).filter(Boolean)
    if (isChoice && choices.length === 0) return setError('선택형 질문은 보기를 1개 이상 입력해주세요.')
    if (state.isMatchingField && !state.matchingStrategy) return setError('매칭 항목은 매칭 방식을 선택해주세요.')

    // question key는 화면에 노출하지 않는다. 기존 질문/프리셋은 지정된 key를 유지하고,
    // 자유 질문은 자동 생성한다. (KAN-191)
    const questionKey = state.questionKey.trim() || autoQuestionKey()

    const payload: FormQuestionUpsertRequest = {
      questionKey,
      type: state.type,
      label: state.label.trim(),
      placeholder: state.placeholder.trim() || undefined,
      required: state.required,
      displayOrder: initial?.displayOrder ?? nextOrder,
      options: isChoice ? { choices } : undefined,
      isMatchingField: state.isMatchingField,
      matchingStrategy: state.isMatchingField ? (state.matchingStrategy as MatchingStrategy) : undefined,
      matchingWeight: state.isMatchingField ? 1 : undefined,
    }

    const onDone = { onSuccess: onClose }
    if (isEdit && initial) {
      updateQuestion.mutate({ questionId: initial.questionId, data: payload }, onDone)
    } else {
      addQuestion.mutate(payload, onDone)
    }
  }

  const isPending = addQuestion.isPending || updateQuestion.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-[16px] w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[#F0EBE8] flex items-center justify-between">
          <h3 className="font-bold text-[16px] text-[#1A1A1A]">{isEdit ? '질문 수정' : '질문 추가'}</h3>
          <button onClick={onClose} className="text-[#767676] hover:text-[#1A1A1A]"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {/* 프리셋 (새 질문일 때만) */}
          {!isEdit && (
            <div>
              <p className="text-[12px] text-[#767676] mb-1.5">매칭 프리셋 (클릭하면 자동 입력)</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    title={p.hint}
                    className="px-2.5 py-1.5 rounded-full border border-tag-bg text-[12px] text-[#5C4033] hover:border-primary hover:text-primary transition-colors"
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 라벨 */}
          <Field label="질문 (화면에 보이는 문구) *">
            <input value={state.label} onChange={(e) => set('label', e.target.value)} placeholder="예: 나이를 알려주세요" className={inputCls} />
          </Field>

          {/* 유형 (question key는 화면에 노출하지 않고 프리셋/자동으로 지정됨 — KAN-191) */}
          <Field label="유형 *">
            <select value={state.type} onChange={(e) => handleTypeChange(e.target.value as QuestionType)} className={inputCls}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
          </Field>

          {/* 선택지 */}
          {isChoice && (
            <Field label="보기 (줄바꿈으로 구분) *">
              <textarea value={state.choicesText} onChange={(e) => set('choicesText', e.target.value)} rows={4} placeholder={'영화\n음악\n여행'} className={`${inputCls} resize-none`} />
            </Field>
          )}

          {/* 안내문구 */}
          {!isChoice && state.type !== 'MBTI_INPUT' && (
            <Field label="입력 안내문구 (선택)">
              <input value={state.placeholder} onChange={(e) => set('placeholder', e.target.value)} placeholder="예: 숫자만 입력" className={inputCls} />
            </Field>
          )}

          {/* 필수 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={state.required} onChange={(e) => set('required', e.target.checked)} className="w-4 h-4 accent-[#C8392B]" />
            <span className="text-[14px] text-[#1A1A1A]">필수 응답</span>
          </label>

          {/* 매칭 */}
          <div className="rounded-[12px] border border-[#F0EBE8] p-3 bg-[#FAF8F6] flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={state.isMatchingField} onChange={(e) => handleMatchingFieldChange(e.target.checked)} className="w-4 h-4 accent-[#C8392B]" />
              <span className="text-[14px] font-medium text-[#1A1A1A]">매칭에 사용</span>
            </label>
            {isHardKey && (
              <p className="text-[12px] text-[#767676]">
                {state.questionKey === 'age'
                  ? '나이는 ±8살 이내만 같은 그룹이 돼요(하드 조건). 비슷한 나이 우대까지 하려면 매칭 사용을 켜고 ‘비슷하게’를 고르세요.'
                  : '이 항목은 겹치는 사람끼리만 같은 그룹이 돼요(하드 조건). 매칭 사용을 꺼도 자동 적용됩니다.'}
              </p>
            )}
            {state.isMatchingField && (
              <div>
                <Field label="매칭 방식">
                  <select value={state.matchingStrategy} onChange={(e) => set('matchingStrategy', e.target.value as MatchingStrategy)} className={inputCls}>
                    <option value="">선택</option>
                    <option value="SAME">비슷하게</option>
                    <option value="DIVERSE">다양하게</option>
                    <option value="OVERLAP">많이 겹치게</option>
                  </select>
                </Field>
              </div>
            )}
          </div>

          {error && <p className="text-[13px] text-[#C8392B]">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-[#F0EBE8] flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-input text-[14px] text-[#767676] hover:bg-[#F5F0EB]">취소</button>
          <button onClick={handleSave} disabled={isPending} className="flex-1 px-4 py-2.5 rounded-input text-[14px] font-semibold bg-primary text-white hover:opacity-90 disabled:opacity-50">
            {isPending ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 rounded-input border border-[#F0EBE8] bg-white text-[14px] focus:outline-none focus:ring-1 focus:ring-primary'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[13px] font-medium text-[#1A1A1A]">{label}</label>
      {children}
      {hint && <span className="text-[11px] text-[#999]">{hint}</span>}
    </div>
  )
}
