'use client'

import { useState } from 'react'
import { useAdminTranslations, useOverrideTranslation } from '@/lib/hooks/useAdminTranslations'
import type { AdminContentTranslation } from '@/lib/api/types'

interface AdminTranslationPanelProps {
  entityType: string
  entityId: string
  fields: { key: string; label: string }[]
}

const LOCALES: { code: 'EN' | 'JA'; label: string }[] = [
  { code: 'EN', label: 'English' },
  { code: 'JA', label: '日本語' },
]

const STATUS_LABEL: Record<string, string> = {
  PENDING: '번역 중',
  DONE: '완료',
  FAILED: '실패',
}

// 관리자 번역 상태 표시 + 수동 보정 패널. 게더링 수정 화면에서 사용. (KAN-268)
export default function AdminTranslationPanel({ entityType, entityId, fields }: AdminTranslationPanelProps) {
  const { data: translations, isLoading } = useAdminTranslations(entityType, entityId)
  const overrideMutation = useOverrideTranslation(entityType, entityId)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const find = (field: string, code: 'EN' | 'JA'): AdminContentTranslation | undefined =>
    translations?.find((t) => t.field === field && t.locale === code.toLowerCase())

  const handleSave = (field: string, code: 'EN' | 'JA', value: string) => {
    overrideMutation.mutate({ entityType, entityId, field, locale: code, value })
  }

  return (
    <div className="flex flex-col gap-3 rounded-card bg-card p-4">
      <p className="text-sm font-bold text-foreground">번역 상태 (영어 · 일본어)</p>
      {isLoading && <p className="text-xs text-tag-text">불러오는 중…</p>}
      {fields.map((field) => (
        <div key={field.key} className="flex flex-col gap-2">
          <p className="text-xs font-medium text-tag-text">{field.label}</p>
          {LOCALES.map(({ code, label }) => {
            const translation = find(field.key, code)
            const draftKey = `${field.key}:${code}`
            const value = drafts[draftKey] ?? translation?.value ?? ''
            const status = translation?.status ?? 'PENDING'
            return (
              <div key={code} className="flex items-start gap-2">
                <span className="w-16 shrink-0 pt-2 text-xs text-tag-text">{label}</span>
                <div className="flex flex-1 flex-col gap-1">
                  <textarea
                    value={value}
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [draftKey]: event.target.value }))}
                    rows={2}
                    className="w-full rounded-input border border-tag-bg bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] ${status === 'FAILED' ? 'text-primary' : 'text-tag-text'}`}>
                      {STATUS_LABEL[status] ?? status}
                      {translation?.isOverride ? ' · 수동수정됨' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSave(field.key, code, value)}
                      disabled={overrideMutation.isPending}
                      className="min-h-[32px] rounded-input bg-tag-bg px-3 py-1 text-xs font-medium text-tag-text disabled:opacity-50"
                    >
                      저장
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
