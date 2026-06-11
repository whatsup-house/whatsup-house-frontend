import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  runMatching,
  fetchMatchingResult,
  moveMatchingMember,
  excludeMatchingMember,
  assignMatchingMember,
  confirmMatchingGroup,
  updateMatchingRestaurant,
} from '@/lib/api/matching'
import { adminGatheringApi } from '@/lib/api/adminGathering'

function errMessage(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
}

// 매칭 결과 조회 (그룹/멤버/미배정)
export function useMatchingResult(gatheringId: string) {
  return useQuery({
    queryKey: ['matching', gatheringId],
    queryFn: () => fetchMatchingResult(gatheringId),
    enabled: !!gatheringId,
  })
}

// 신청 상세 (멤버 클릭 시 답변 조회) — applicationId 있을 때만 실행
export function useAdminApplicationDetail(applicationId: string | null) {
  return useQuery({
    queryKey: ['admin', 'application', applicationId],
    queryFn: () => adminGatheringApi.getApplicationDetail(applicationId as string),
    enabled: !!applicationId,
  })
}

// 자동매칭 실행
export function useRunMatching(gatheringId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (groupSize: number) => runMatching(gatheringId, groupSize),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matching', gatheringId] })
    },
    onError: (err: unknown) => alert(errMessage(err, '자동매칭 실행 중 오류가 발생했어요.')),
  })
}

// 멤버 이동
export function useMoveMatchingMember(gatheringId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ memberId, targetGroupId }: { memberId: string; targetGroupId: string }) =>
      moveMatchingMember(memberId, targetGroupId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matching', gatheringId] }),
    onError: (err: unknown) => alert(errMessage(err, '멤버 이동 중 오류가 발생했어요.')),
  })
}

// 멤버 제외
export function useExcludeMatchingMember(gatheringId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => excludeMatchingMember(memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matching', gatheringId] }),
    onError: (err: unknown) => alert(errMessage(err, '멤버 제외 중 오류가 발생했어요.')),
  })
}

// 강제 배정
export function useAssignMatchingMember(gatheringId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, applicationId }: { groupId: string; applicationId: string }) =>
      assignMatchingMember(groupId, applicationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matching', gatheringId] }),
    onError: (err: unknown) => alert(errMessage(err, '강제 배정 중 오류가 발생했어요.')),
  })
}

// 그룹 확정
export function useConfirmMatchingGroup(gatheringId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) => confirmMatchingGroup(groupId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matching', gatheringId] }),
    onError: (err: unknown) => alert(errMessage(err, '그룹 확정 중 오류가 발생했어요.')),
  })
}

// 식당 정보 입력
export function useUpdateMatchingRestaurant(gatheringId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      groupId,
      restaurantName,
      restaurantAddress,
    }: {
      groupId: string
      restaurantName: string
      restaurantAddress: string
    }) => updateMatchingRestaurant(groupId, restaurantName, restaurantAddress),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matching', gatheringId] }),
    onError: (err: unknown) => alert(errMessage(err, '식당 정보 저장 중 오류가 발생했어요.')),
  })
}
