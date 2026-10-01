import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  confirmDiningTableNow,
  dissolveDiningTable,
  fetchDiningApplicants,
  fetchDiningApplicantsCsv,
  fetchDiningAttendance,
  fetchDiningDashboard,
  fetchDiningFeedbackSummary,
  fetchDiningTables,
  fetchDiningTablesCsv,
  mergeDiningTables,
  moveDiningTableMember,
  retryDiningChatRoom,
  retryDiningNotifications,
  runDiningMatch,
  splitDiningTable,
  updateDiningAttendance,
  updateSessionVenues,
} from '@/lib/api/adminDining'
import type {
  DiningAttendanceStatus,
  DiningTableAdjustRequest,
  DiningTableConfirmResult,
  DiningTableList,
  DiningTableViolation,
  SessionVenueRequest,
} from '@/lib/api/types'
import { useToastStore } from '@/lib/store/toastStore'
import { getAdminApiErrorMessage, getApiErrorCode, getApiErrorStatus } from '@/lib/utils/apiError'

// 운영 대시보드. 신청·테이블 수치가 계속 바뀌어 staleTime을 두지 않는다. (KAN-351)
export function useDiningDashboard() {
  return useQuery({
    queryKey: ['admin', 'dining', 'dashboard'],
    queryFn: fetchDiningDashboard,
  })
}

// 여러 회차(주간 반복으로 만든 회차들)에 같은 식당 풀을 설정한다.
export function useUpdateSessionVenues() {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)
  return useMutation({
    mutationFn: ({ sessionIds, venues }: { sessionIds: string[]; venues: SessionVenueRequest[] }) =>
      Promise.all(sessionIds.map((id) => updateSessionVenues(id, venues))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'dining'] }),
    onError: (err: unknown) => showToast(getAdminApiErrorMessage(err, '식당 풀을 저장하지 못했어요.'), 'error'),
  })
}

// ===== 회차 콘솔 (KAN-352) =====
// 한 회차의 신청자·테이블·참석·피드백은 이 키 아래에 둔다. 조정 한 번이 매칭 상태·대시보드 수치까지 바꾼다.
const sessionKey = (sessionId: string) => ['admin', 'dining', 'session', sessionId] as const
const tablesKey = (sessionId: string) => [...sessionKey(sessionId), 'tables'] as const

function useInvalidateSession(sessionId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: sessionKey(sessionId) })
    queryClient.invalidateQueries({ queryKey: ['admin', 'dining', 'dashboard'] })
  }
}

export function useDiningApplicants(sessionId: string) {
  return useQuery({
    queryKey: [...sessionKey(sessionId), 'applicants'],
    queryFn: () => fetchDiningApplicants(sessionId),
  })
}

// 자동 확정·참가자 취소로 서버에서 계속 바뀐다. 30초 폴링 + 창 포커스 때마다 재조회(staleTime 0).
export function useDiningTables(sessionId: string) {
  return useQuery({
    queryKey: tablesKey(sessionId),
    queryFn: () => fetchDiningTables(sessionId),
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // 클릭 직후 바로 해제하면 일부 브라우저(Safari)에서 다운로드가 취소된다
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// 신청자 표·테이블 결과 CSV를 받아 바로 저장한다.
export function useDownloadDiningCsv(sessionId: string) {
  const showToast = useToastStore((s) => s.show)
  return useMutation({
    mutationFn: async (kind: 'applicants' | 'tables') => {
      const blob = kind === 'applicants' ? await fetchDiningApplicantsCsv(sessionId) : await fetchDiningTablesCsv(sessionId)
      saveBlob(blob, `${kind}-${sessionId}.csv`)
    },
    // blob 응답이라 서버 메시지를 읽을 수 없다
    onError: () => showToast('CSV를 내려받지 못했어요.', 'error'),
  })
}

export function useRunDiningMatch(sessionId: string) {
  const showToast = useToastStore((s) => s.show)
  const invalidate = useInvalidateSession(sessionId)
  return useMutation({
    mutationFn: () => runDiningMatch(sessionId),
    onSuccess: (run) => {
      const extras = [
        run.splitCount > 0 && `분리 ${run.splitCount}`,
        run.mergeCount > 0 && `병합 ${run.mergeCount}`,
        run.reallocatedCount > 0 && `재배치 ${run.reallocatedCount}명`,
      ].filter(Boolean).join(' · ')
      showToast(
        `매칭 완료: 후보 ${run.candidateCount}명 → 테이블 ${run.tableCount}개, 미배정 ${run.unassignedCount}명${extras ? ` (${extras})` : ''}`,
      )
    },
    onError: (err: unknown) => showToast(getAdminApiErrorMessage(err, '매칭을 실행하지 못했어요.'), 'error'),
    onSettled: invalidate,
  })
}

// 즉시 확정. 여러 개면 순서대로 하나씩 부르고, 하나가 실패해도(409 이미 확정 등) 나머지는 계속한다.
export function useConfirmDiningTablesNow(sessionId: string) {
  const showToast = useToastStore((s) => s.show)
  const invalidate = useInvalidateSession(sessionId)
  return useMutation({
    mutationFn: async (tableIds: string[]) => {
      const results: DiningTableConfirmResult[] = []
      let lastError: unknown = null
      for (const id of tableIds) {
        try {
          results.push(await confirmDiningTableNow(id))
        } catch (err) {
          lastError = err
        }
      }
      return { results, failed: tableIds.length - results.length, lastError }
    },
    onSuccess: ({ results, failed, lastError }) => {
      if (results.length === 0) {
        showToast(getAdminApiErrorMessage(lastError, '즉시 확정하지 못했어요.'), 'error')
        return
      }
      const confirmed = results.filter((r) => r.status === 'CONFIRMED').length
      const held = results.length - confirmed
      const parts = [`확정 ${confirmed}개`]
      if (held > 0) parts.push(`보류 ${held}개(규칙 위반, 예외함 확인)`)
      if (failed > 0) parts.push(`실패 ${failed}개`)
      showToast(parts.join(' · '), held > 0 || failed > 0 ? 'error' : 'default')
    },
    onSettled: invalidate,
  })
}

// 400 TABLE_RULE_VIOLATION의 params.violations
export function getTableViolations(err: unknown): DiningTableViolation[] {
  if (getApiErrorCode(err) !== 'TABLE_RULE_VIOLATION') return []
  const params = (err as { response?: { data?: { params?: { violations?: unknown } } } }).response?.data?.params
  return Array.isArray(params?.violations) ? (params.violations as DiningTableViolation[]) : []
}

// 낙관적 이동: 멤버 칩을 원래 테이블에서 빼 대상 테이블 끝에 붙인다.
function moveMemberInList(
  list: DiningTableList,
  { tableId, memberId, targetTableId }: { tableId: string; memberId: string; targetTableId: string },
): DiningTableList {
  const member = list.tables.find((t) => t.id === tableId)?.members.find((m) => m.memberId === memberId)
  if (!member || tableId === targetTableId) return list
  return {
    ...list,
    tables: list.tables.map((t) => {
      if (t.id === tableId) return { ...t, members: t.members.filter((m) => m.memberId !== memberId) }
      if (t.id === targetTableId) return { ...t, members: [...t.members, { ...member, isManual: true }] }
      return t
    }),
  }
}

// 멤버 이동·분리·병합·해체. 이동은 카드에 바로 반영하고(낙관적) 실패하면 원위치한다.
// 400 규칙 위반은 서버가 롤백하므로 토스트 + 원복, 409(이미 확정 등)는 토스트 + 재조회(onSettled).
export function useAdjustDiningTables(sessionId: string) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)
  const invalidate = useInvalidateSession(sessionId)
  return useMutation({
    mutationFn: (request: DiningTableAdjustRequest) => {
      switch (request.type) {
        case 'move': return moveDiningTableMember(request)
        case 'split': return splitDiningTable(request)
        case 'merge': return mergeDiningTables(request)
        case 'dissolve': return dissolveDiningTable(request)
      }
    },
    onMutate: async (request) => {
      if (request.type !== 'move') return { previous: undefined }
      await queryClient.cancelQueries({ queryKey: tablesKey(sessionId) })
      const previous = queryClient.getQueryData<DiningTableList>(tablesKey(sessionId))
      if (previous) queryClient.setQueryData(tablesKey(sessionId), moveMemberInList(previous, request))
      return { previous }
    },
    onSuccess: () => showToast('테이블을 조정했어요.'),
    onError: (err: unknown, _request, context) => {
      if (context?.previous) queryClient.setQueryData(tablesKey(sessionId), context.previous)
      if (getApiErrorStatus(err) === 409) {
        showToast(getAdminApiErrorMessage(err, '테이블 상태가 바뀌었어요. 최신 상태로 다시 불러와요.'), 'error')
        return
      }
      const violations = getTableViolations(err)
      const detail = violations.length > 0 ? ` (${violations.map((v) => v.message).join(' / ')})` : ''
      showToast(`${getAdminApiErrorMessage(err, '테이블을 조정하지 못했어요.')}${detail}`, 'error')
    },
    onSettled: invalidate,
  })
}

export function useRetryDiningChatRoom(sessionId: string) {
  const showToast = useToastStore((s) => s.show)
  const invalidate = useInvalidateSession(sessionId)
  return useMutation({
    mutationFn: (tableId: string) => retryDiningChatRoom(tableId),
    onSuccess: () => showToast('채팅방을 확인했어요. 없던 방은 새로 만들었어요.'),
    onError: (err: unknown) => showToast(getAdminApiErrorMessage(err, '채팅방을 만들지 못했어요.'), 'error'),
    onSettled: invalidate,
  })
}

export function useRetryDiningNotifications() {
  const showToast = useToastStore((s) => s.show)
  return useMutation({
    mutationFn: (tableId: string) => retryDiningNotifications(tableId),
    onSuccess: () => showToast('확정 알림을 다시 보냈어요.'),
    onError: (err: unknown) => showToast(getAdminApiErrorMessage(err, '알림을 다시 보내지 못했어요.'), 'error'),
  })
}

// KAN-349 전이면 404 → 화면에서 "준비 중" 안내. 재시도하지 않는다.
export function useDiningAttendance(sessionId: string) {
  return useQuery({
    queryKey: [...sessionKey(sessionId), 'attendance'],
    queryFn: () => fetchDiningAttendance(sessionId),
    retry: false,
  })
}

export function useUpdateDiningAttendance(sessionId: string) {
  const showToast = useToastStore((s) => s.show)
  const invalidate = useInvalidateSession(sessionId)
  return useMutation({
    mutationFn: ({ attendanceId, status }: { attendanceId: string; status: DiningAttendanceStatus }) =>
      updateDiningAttendance(attendanceId, status),
    onSuccess: () => showToast('참석 상태를 바꿨어요.'),
    onError: (err: unknown) => showToast(getAdminApiErrorMessage(err, '참석 상태를 바꾸지 못했어요.'), 'error'),
    onSettled: invalidate,
  })
}

// KAN-350 머지 전이면 404일 수 있다. 재시도하지 않는다.
export function useDiningFeedbackSummary(sessionId: string) {
  return useQuery({
    queryKey: [...sessionKey(sessionId), 'feedback-summary'],
    queryFn: () => fetchDiningFeedbackSummary(sessionId),
    retry: false,
  })
}
