import apiClient from './client'
import type { ApiResponse } from './types'

// 메일 템플릿 목록 항목 (GET /api/admin/mail-templates)
export interface MailTemplateListItem {
  templateKey: string
  description: string
  subject: string
}

// 메일 템플릿 상세 (GET /api/admin/mail-templates/{key})
export interface MailTemplateDetail {
  templateKey: string
  description: string
  subject: string
  body: string
  variables: string[] // 본문에서 사용 가능한 치환 변수
}

export interface MailTemplatePreview {
  subject: string
  body: string
}

export interface MailTemplatePreviewRequest {
  subject?: string
  body?: string
  variables?: Record<string, string>
}

export const adminMailTemplateApi = {
  getAll: async (): Promise<MailTemplateListItem[]> => {
    const res = await apiClient.get<ApiResponse<MailTemplateListItem[]>>('/api/admin/mail-templates')
    return res.data.data ?? []
  },

  getByKey: async (templateKey: string): Promise<MailTemplateDetail> => {
    const res = await apiClient.get<ApiResponse<MailTemplateDetail>>(`/api/admin/mail-templates/${templateKey}`)
    return res.data.data
  },

  update: async (templateKey: string, data: { subject: string; body: string }): Promise<MailTemplateDetail> => {
    const res = await apiClient.put<ApiResponse<MailTemplateDetail>>(
      `/api/admin/mail-templates/${templateKey}`,
      data,
    )
    return res.data.data
  },

  // 초안 제목/본문과 변수로 치환 결과를 미리본다. 변수 생략 시 백엔드가 샘플 값으로 채운다.
  preview: async (templateKey: string, data: MailTemplatePreviewRequest): Promise<MailTemplatePreview> => {
    const res = await apiClient.post<ApiResponse<MailTemplatePreview>>(
      `/api/admin/mail-templates/${templateKey}/preview`,
      data,
    )
    return res.data.data
  },
}
