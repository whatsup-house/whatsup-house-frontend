import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminMailTemplateApi, type MailTemplatePreviewRequest } from '@/lib/api/adminMailTemplate'

export function useMailTemplates() {
  return useQuery({
    queryKey: ['admin', 'mail-templates'],
    queryFn: adminMailTemplateApi.getAll,
    staleTime: 1000 * 60,
  })
}

export function useMailTemplate(templateKey: string | null) {
  return useQuery({
    queryKey: ['admin', 'mail-template', templateKey],
    queryFn: () => adminMailTemplateApi.getByKey(templateKey as string),
    enabled: !!templateKey,
    staleTime: 1000 * 30,
  })
}

export function useUpdateMailTemplate(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ templateKey, subject, body }: { templateKey: string; subject: string; body: string }) =>
      adminMailTemplateApi.update(templateKey, { subject, body }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'mail-templates'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'mail-template', variables.templateKey] })
      onSuccess?.()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '저장 중 오류가 발생했어요.')
    },
  })
}

export function usePreviewMailTemplate() {
  return useMutation({
    mutationFn: ({ templateKey, ...data }: { templateKey: string } & MailTemplatePreviewRequest) =>
      adminMailTemplateApi.preview(templateKey, data),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '미리보기 중 오류가 발생했어요.')
    },
  })
}
