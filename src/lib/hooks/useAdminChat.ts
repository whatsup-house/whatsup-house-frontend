import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import {
  addChatMembers,
  createAdminChatRoom,
  deleteAdminChatRoom,
  fetchAdminChatRooms,
  fetchChatReports,
  fetchChatSourceMembers,
  fetchDiningTableGroups,
  kickChatMember,
  muteChatUser,
  unmuteChatUser,
  updateChatReportStatus,
} from '@/lib/api/adminChat'
import { adminGatheringApi } from '@/lib/api/adminGathering'
import { deleteChatMessage } from '@/lib/api/chat'
import type { ChatReportStatus, ChatSourceType } from '@/lib/api/types'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'
import { messagesKey, roomKey, roomsKey } from './useChat'

const adminRoomsKey = ['admin', 'chat', 'rooms'] as const
const reportsKey = ['admin', 'chat', 'reports'] as const

const alertError = (fallback: string) => (error: unknown) => alert(getAdminApiErrorMessage(error, fallback))

// 멤버 변경은 JOINED/KICKED 시스템 메시지를 남기므로 방 상세·메시지·목록을 모두 다시 받는다.
function invalidateRoom(queryClient: QueryClient, roomId: string) {
  queryClient.invalidateQueries({ queryKey: roomKey(roomId) })
  queryClient.invalidateQueries({ queryKey: messagesKey(roomId) })
  queryClient.invalidateQueries({ queryKey: adminRoomsKey })
  queryClient.invalidateQueries({ queryKey: roomsKey })
}

export function useAdminChatRooms() {
  return useQuery({
    queryKey: adminRoomsKey,
    queryFn: fetchAdminChatRooms,
    retry: false,
    // 미답변 문의 확인용 폴링. 소켓 연동 일감 이후 즉시 갱신으로 바뀐다.
    refetchInterval: 30_000,
  })
}

export function useCreateChatRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAdminChatRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminRoomsKey })
      queryClient.invalidateQueries({ queryKey: roomsKey })
    },
    onError: alertError('채팅방을 만들지 못했어요.'),
  })
}

// 출처 셀렉트용 게더링 목록
export function useChatSourceGatherings() {
  return useQuery({
    queryKey: ['admin', 'chat', 'gatherings'],
    queryFn: () => adminGatheringApi.getAll(),
    staleTime: 1000 * 60 * 5,
  })
}

// 우연한 식탁 조 목록 (게더링을 고른 뒤 조 선택)
export function useDiningTableGroups(gatheringId: string) {
  return useQuery({
    queryKey: ['admin', 'chat', 'dining-groups', gatheringId],
    queryFn: () => fetchDiningTableGroups(gatheringId),
    enabled: !!gatheringId,
  })
}

// 셀렉트를 고른 순간 한 번 불러와 선택 멤버에 합친다 — 명령형 조회라 mutation 으로 둔다.
export function useLoadSourceMembers() {
  return useMutation({
    mutationFn: ({ type, id }: { type: ChatSourceType; id: string }) => fetchChatSourceMembers(type, id),
    onError: alertError('멤버를 불러오지 못했어요.'),
  })
}

export function useAddChatMembers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ roomId, userIds }: { roomId: string; userIds: string[] }) => addChatMembers(roomId, userIds),
    onSuccess: (_data, { roomId }) => invalidateRoom(queryClient, roomId),
    onError: alertError('멤버를 추가하지 못했어요.'),
  })
}

export function useKickChatMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) => kickChatMember(roomId, userId),
    onSuccess: (_data, { roomId }) => invalidateRoom(queryClient, roomId),
    onError: alertError('멤버를 내보내지 못했어요.'),
  })
}

export function useDeleteChatRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roomId: string) => deleteAdminChatRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminRoomsKey })
      queryClient.invalidateQueries({ queryKey: roomsKey })
    },
    onError: alertError('채팅방을 삭제하지 못했어요.'),
  })
}

export function useMuteChatUser() {
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) => muteChatUser(userId, reason),
    onError: alertError('채팅 금지하지 못했어요.'),
  })
}

export function useUnmuteChatUser() {
  return useMutation({
    mutationFn: (userId: string) => unmuteChatUser(userId),
    onError: alertError('채팅 금지를 해제하지 못했어요.'),
  })
}

export function useChatReports(status: ChatReportStatus | undefined) {
  return useQuery({
    queryKey: [...reportsKey, status ?? 'ALL'],
    queryFn: () => fetchChatReports(status),
    retry: false,
  })
}

export function useResolveChatReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reportId: string) => updateChatReportStatus(reportId, 'RESOLVED'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportsKey }),
    onError: alertError('신고를 처리하지 못했어요.'),
  })
}

// 신고 목록에서 바로 삭제. 관리자는 방 멤버가 아니어도 지울 수 있다.
export function useDeleteReportedMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ messageId }: { messageId: string; roomId: string }) => deleteChatMessage(messageId),
    onSuccess: (_data, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: reportsKey })
      queryClient.invalidateQueries({ queryKey: messagesKey(roomId) })
      queryClient.invalidateQueries({ queryKey: adminRoomsKey })
    },
    onError: alertError('메시지를 삭제하지 못했어요.'),
  })
}
