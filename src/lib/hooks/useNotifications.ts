import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  deleteNotification,
} from '@/lib/api/notification'
import { useAuthStore } from '@/lib/store/authStore'

// 미확인 알림 개수. 헤더 뱃지용으로 로그인 상태에서만 조회한다.
// 미배포 BE에서도 graceful하도록 retry는 끈다.
export function useUnreadCount() {
  const { isLoggedIn } = useAuthStore()
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    enabled: isLoggedIn,
    retry: false,
    staleTime: 1000 * 30,
  })
}

// 알림 목록. 모달이 열렸을 때만 조회한다.
export function useNotifications(enabled: boolean) {
  const { isLoggedIn } = useAuthStore()
  return useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: fetchNotifications,
    enabled: isLoggedIn && enabled,
    retry: false,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
