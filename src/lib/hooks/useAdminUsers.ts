import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminUserApi } from '@/lib/api/adminUser'

export function useAdminUsers(keyword: string, page: number) {
  return useQuery({
    queryKey: ['admin', 'users', keyword, page],
    queryFn: () => adminUserApi.getUsers(keyword || undefined, page),
    staleTime: 1000 * 30,
  })
}

export function useAdminUserDetail(id: string) {
  return useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: () => adminUserApi.getUserDetail(id),
  })
}

export function useUpdateUserStatus(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (suspend: boolean) => adminUserApi.updateStatus(userId, suspend),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId] })
    },
    onError: () => alert('상태 변경 중 오류가 발생했습니다.'),
  })
}
