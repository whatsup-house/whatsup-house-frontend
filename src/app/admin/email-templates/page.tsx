'use client'

import { useState } from 'react'
import { Input } from '@/components/ui'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  useMailTemplates,
  useMailTemplate,
  useUpdateMailTemplate,
  usePreviewMailTemplate,
} from '@/lib/hooks/useAdminMailTemplates'
import type { MailTemplateDetail } from '@/lib/api/adminMailTemplate'

// ─── 템플릿 편집기 ──────────────────────────────────────────────────────
// detail이 로드된 뒤 key={templateKey}로 마운트되므로, useState 초기값으로 안전하게 prefill한다.
function TemplateEditor({ detail }: { detail: MailTemplateDetail }) {
  const [subject, setSubject] = useState(detail.subject)
  const [body, setBody] = useState(detail.body)

  const update = useUpdateMailTemplate(() => alert('저장되었어요.'))
  const preview = usePreviewMailTemplate()

  const dirty = subject !== detail.subject || body !== detail.body

  const handleInsertVariable = (variable: string) => {
    setBody((prev) => `${prev}{{${variable}}}`)
  }

  const handlePreview = () => {
    preview.mutate({ templateKey: detail.templateKey, subject, body })
  }

  const handleSave = () => {
    update.mutate({ templateKey: detail.templateKey, subject, body })
  }

  return (
    <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] p-6">
      <div className="mb-5">
        <h2 className="font-bold text-[18px] text-[#1A1A1A]">{detail.description}</h2>
        <p className="text-xs text-[#767676] mt-1">{detail.templateKey}</p>
      </div>

      {/* 제목 */}
      <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">제목</label>
      <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full mb-4" />

      {/* 본문 */}
      <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">본문</label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={14}
        className="w-full rounded-[12px] border border-tag-bg bg-card text-foreground text-sm px-4 py-3 leading-relaxed
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
      />

      {/* 사용 가능 변수 */}
      <div className="mt-3">
        <p className="text-xs text-[#767676] mb-1.5">사용 가능 변수 (클릭하면 본문에 추가돼요)</p>
        <div className="flex flex-wrap gap-1.5">
          {detail.variables.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => handleInsertVariable(v)}
              className="px-2 py-1 rounded-full bg-[#F0EBE8] text-[#5C4033] text-xs font-mono hover:bg-[#E5DDD6] transition-colors"
            >
              {`{{${v}}}`}
            </button>
          ))}
        </div>
      </div>

      {/* 액션 */}
      <div className="flex items-center gap-2 mt-6">
        <button
          type="button"
          onClick={handlePreview}
          disabled={preview.isPending}
          className="px-4 py-2 rounded-input text-sm font-medium border border-tag-bg text-[#1A1A1A] hover:bg-[#F5F0EB] transition-colors disabled:opacity-50"
        >
          {preview.isPending ? '미리보는 중…' : '미리보기'}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || update.isPending}
          className="px-4 py-2 rounded-input text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {update.isPending ? '저장 중…' : '저장'}
        </button>
        {dirty && <span className="text-xs text-[#C8392B]">저장하지 않은 변경 사항이 있어요</span>}
      </div>

      {/* 미리보기 결과 */}
      {preview.data && (
        <div className="mt-5 border-t border-[#F0EBE8] pt-5">
          <p className="text-xs font-medium text-[#767676] mb-2">미리보기 (샘플 값으로 치환)</p>
          <div className="bg-[#F8F5F2] rounded-[12px] p-4">
            <p className="text-sm font-bold text-[#1A1A1A] mb-2">{preview.data.subject}</p>
            <p className="text-sm text-[#3A3A3A] whitespace-pre-wrap leading-relaxed">{preview.data.body}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 메인 페이지 ───────────────────────────────────────────────────────
export default function AdminEmailTemplatesPage() {
  const { data: templates = [], isLoading } = useMailTemplates()
  const [selectedKeyState, setSelectedKeyState] = useState<string | null>(null)

  // 명시적 선택이 없으면 첫 템플릿을 기본 선택한다 (effect 없이 파생).
  const selectedKey = selectedKeyState ?? templates[0]?.templateKey ?? null
  const { data: detail, isLoading: isDetailLoading } = useMailTemplate(selectedKey)

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-bold text-[22px] text-foreground">메일 템플릿 관리</h1>
        <p className="text-sm text-[#767676] mt-1">알림 메일의 제목·본문을 수정하고 미리볼 수 있어요. 평문으로 발송됩니다.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : (
        <div className="flex gap-6 items-start">
          {/* 템플릿 목록 */}
          <div className="w-72 shrink-0 bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] p-2">
            {templates.map((t) => {
              const isActive = t.templateKey === selectedKey
              return (
                <button
                  key={t.templateKey}
                  onClick={() => setSelectedKeyState(t.templateKey)}
                  className={`w-full text-left px-3 py-2.5 rounded-[10px] transition-colors ${
                    isActive ? 'bg-[#FDECEA]' : 'hover:bg-[#F5F0EB]'
                  }`}
                >
                  <p className={`text-sm font-semibold ${isActive ? 'text-[#C8392B]' : 'text-[#1A1A1A]'}`}>
                    {t.description}
                  </p>
                  <p className="text-xs text-[#767676] truncate mt-0.5">{t.subject}</p>
                </button>
              )
            })}
          </div>

          {/* 편집기 */}
          <div className="flex-1 min-w-0">
            {isDetailLoading || !detail ? (
              <div className="flex justify-center py-16"><LoadingSpinner /></div>
            ) : (
              <TemplateEditor key={detail.templateKey} detail={detail} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
