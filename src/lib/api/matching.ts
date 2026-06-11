import apiClient from './client'
import type { ApiResponse, MatchingRunResult, MatchingResult } from './types'

// 자동매칭 실행 (CONFIRMED 신청 → 추천 그룹 생성). groupSize로 그룹당 인원 수 지정. (KAN-225)
export const runMatching = async (
  gatheringId: string,
  groupSize: number,
): Promise<MatchingRunResult> => {
  const response = await apiClient.post<ApiResponse<MatchingRunResult>>(
    `/api/admin/gatherings/${gatheringId}/matching`,
    { groupSize },
  )
  return response.data.data
}

// 매칭 결과 조회 (그룹/멤버/미배정)
export const fetchMatchingResult = async (gatheringId: string): Promise<MatchingResult> => {
  const response = await apiClient.get<ApiResponse<MatchingResult>>(
    `/api/admin/gatherings/${gatheringId}/matching`,
  )
  return response.data.data
}

// 멤버 이동 (다른 그룹으로 — 수동 배정 처리)
export const moveMatchingMember = async (
  memberId: string,
  targetGroupId: string,
): Promise<void> => {
  await apiClient.patch(`/api/admin/matching/members/${memberId}/move`, { targetGroupId })
}

// 멤버 제외 (미배정으로 되돌림)
export const excludeMatchingMember = async (memberId: string): Promise<void> => {
  await apiClient.delete(`/api/admin/matching/members/${memberId}`)
}

// 미배정 신청을 그룹에 강제 배정
export const assignMatchingMember = async (
  groupId: string,
  applicationId: string,
): Promise<void> => {
  await apiClient.post(`/api/admin/matching/groups/${groupId}/members`, { applicationId })
}

// 그룹 확정
export const confirmMatchingGroup = async (groupId: string): Promise<void> => {
  await apiClient.patch(`/api/admin/matching/groups/${groupId}/confirm`)
}

// 그룹 식당 정보 입력
export const updateMatchingRestaurant = async (
  groupId: string,
  restaurantName: string,
  restaurantAddress: string,
): Promise<void> => {
  await apiClient.patch(`/api/admin/matching/groups/${groupId}/restaurant`, {
    restaurantName,
    restaurantAddress,
  })
}
