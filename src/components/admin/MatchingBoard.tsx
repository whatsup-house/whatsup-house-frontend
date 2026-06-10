'use client'

import { useState } from 'react'
import dayjs from 'dayjs'
import { Users, UserX, CheckCircle2, Sparkles } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ApplicationAnswersModal from './ApplicationAnswersModal'
import {
  useMatchingResult,
  useRunMatching,
  useMoveMatchingMember,
  useExcludeMatchingMember,
  useAssignMatchingMember,
  useConfirmMatchingGroup,
  useUpdateMatchingRestaurant,
} from '@/lib/hooks/useMatching'
import type { MatchingGroupView, MatchingMemberView } from '@/lib/api/types'

const GROUP_STATUS_LABEL: Record<string, string> = {
  PENDING: '추천',
  CONFIRMED: '확정',
  CANCELLED: '취소',
}
const GROUP_STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-[#FFF3E0] text-[#FF9800]',
  CONFIRMED: 'bg-[#E8F5E9] text-[#4CAF50]',
  CANCELLED: 'bg-[#F5F5F5] text-[#767676]',
}

interface MatchingBoardProps {
  gatheringId: string
  gatheringTitle?: string
}

export default function MatchingBoard({ gatheringId, gatheringTitle }: MatchingBoardProps) {
  const { data, isLoading } = useMatchingResult(gatheringId)
  const runMatching = useRunMatching(gatheringId)
  const moveMember = useMoveMatchingMember(gatheringId)
  const excludeMember = useExcludeMatchingMember(gatheringId)
  const assignMember = useAssignMatchingMember(gatheringId)
  const confirmGroup = useConfirmMatchingGroup(gatheringId)
  const updateRestaurant = useUpdateMatchingRestaurant(gatheringId)

  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)

  const groups = data?.groups ?? []
  const unmatched = data?.unmatched ?? []

  const handleRun = () => {
    const hasResult = groups.length > 0
    const msg = hasResult
      ? '기존 추천 그룹을 지우고 자동매칭을 다시 실행할까요? (확정된 그룹은 유지됩니다)'
      : '확정(CONFIRMED) 신청자를 대상으로 자동매칭을 실행할까요?'
    if (!confirm(msg)) return
    runMatching.mutate(undefined, {
      onSuccess: (res) =>
        alert(
          `자동매칭 완료\n· 대상 ${res.confirmedCount}명\n· 그룹 ${res.groupCount}개\n· 배정 ${res.matchedCount}명\n· 미배정 ${res.unmatchedCount}명`,
        ),
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-[16px] text-[#1A1A1A]">
            {gatheringTitle ? `${gatheringTitle} — 매칭` : '자동매칭'}
          </h2>
          <span className="px-3 py-1 bg-[#F5F0EB] rounded-full text-sm text-[#767676]">
            그룹 {groups.length}개 · 미배정 {unmatched.length}명
          </span>
        </div>
        <button
          onClick={handleRun}
          disabled={runMatching.isPending}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-input text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Sparkles size={16} />
          {runMatching.isPending ? '실행 중…' : groups.length > 0 ? '다시 매칭' : '자동매칭 실행'}
        </button>
      </div>

      {groups.length === 0 && unmatched.length === 0 ? (
        <div className="bg-white rounded-[12px] p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <p className="text-base font-medium text-[#1A1A1A] mb-1">아직 매칭 결과가 없어요.</p>
          <p className="text-sm text-[#767676]">
            확정(CONFIRMED)된 신청자가 있으면 ‘자동매칭 실행’으로 추천 그룹을 만들 수 있어요.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* 그룹 그리드 */}
          {groups.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {groups.map((group, index) => (
                <GroupCard
                  key={group.groupId}
                  group={group}
                  groupIndex={index}
                  allGroups={groups}
                  onMemberClick={setSelectedApplicationId}
                  onMove={(memberId, targetGroupId) => moveMember.mutate({ memberId, targetGroupId })}
                  onExclude={(memberId) => {
                    if (confirm('이 멤버를 그룹에서 제외할까요? (미배정으로 돌아갑니다)')) {
                      excludeMember.mutate(memberId)
                    }
                  }}
                  onConfirm={(groupId) => {
                    if (confirm('이 그룹을 확정할까요?')) confirmGroup.mutate(groupId)
                  }}
                  onSaveRestaurant={(groupId, name, address) =>
                    updateRestaurant.mutate({ groupId, restaurantName: name, restaurantAddress: address })
                  }
                />
              ))}
            </div>
          )}

          {/* 미배정 */}
          <UnmatchedList
            members={unmatched}
            groups={groups}
            onMemberClick={setSelectedApplicationId}
            onAssign={(groupId, applicationId) => assignMember.mutate({ groupId, applicationId })}
          />
        </div>
      )}

      {/* 신청서 답변 모달 */}
      <ApplicationAnswersModal
        applicationId={selectedApplicationId}
        onClose={() => setSelectedApplicationId(null)}
      />
    </div>
  )
}

// ─── 그룹 카드 ──────────────────────────────────────────────────────────
interface GroupCardProps {
  group: MatchingGroupView
  groupIndex: number
  allGroups: MatchingGroupView[]
  onMemberClick: (applicationId: string) => void
  onMove: (memberId: string, targetGroupId: string) => void
  onExclude: (memberId: string) => void
  onConfirm: (groupId: string) => void
  onSaveRestaurant: (groupId: string, name: string, address: string) => void
}

function GroupCard({ group, groupIndex, allGroups, onMemberClick, onMove, onExclude, onConfirm, onSaveRestaurant }: GroupCardProps) {
  const [restaurantName, setRestaurantName] = useState(group.restaurantName ?? '')
  const [restaurantAddress, setRestaurantAddress] = useState(group.restaurantAddress ?? '')

  const otherGroups = allGroups.filter((g) => g.groupId !== group.groupId)
  const fitPercent = formatFitPercent(group.groupScore)
  const groupLabel = getGroupLabel(groupIndex)
  const isConfirmed = group.status === 'CONFIRMED'
  const restaurantDirty =
    restaurantName !== (group.restaurantName ?? '') || restaurantAddress !== (group.restaurantAddress ?? '')

  return (
    <div className="bg-white rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col">
      {/* 카드 헤더 */}
      <div className="px-4 py-3 border-b border-[#F0EBE8] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[14px] text-[#1A1A1A]">
            {groupLabel}
          </span>
          <span className="text-[12px] text-[#767676]">
            {dayjs(group.eventDate).format('M월 D일')}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${GROUP_STATUS_STYLE[group.status] ?? ''}`}>
            {GROUP_STATUS_LABEL[group.status] ?? group.status}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#767676]">
          <span>
            {fitPercent != null ? `매칭적합도 ${fitPercent}%` : '적합도 계산 전'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users size={12} />
            {group.groupSize}명
          </span>
        </div>
      </div>

      {/* 멤버 목록 */}
      <div className="px-2 py-2 flex flex-col gap-1 flex-1">
        {group.members.map((m) => (
          <div
            key={m.memberId ?? m.applicationId}
            className="flex items-center gap-2 px-2 py-2 rounded-input hover:bg-[#F5F0EB] transition-colors"
          >
            <button
              onClick={() => onMemberClick(m.applicationId)}
              className="flex-1 text-left min-w-0"
            >
              <span className="text-[14px] font-medium text-[#1A1A1A] hover:underline">{m.name ?? '-'}</span>
              <span className="text-[12px] text-[#767676] ml-2">{m.phone ?? ''}</span>
              {m.manualAssign && (
                <span className="ml-2 px-1.5 py-0.5 bg-[#E3F2FD] text-[#1976D2] rounded text-[10px]">수동</span>
              )}
            </button>

            {!isConfirmed && (
              <>
                {otherGroups.length > 0 && m.memberId && (
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && m.memberId) onMove(m.memberId, e.target.value)
                    }}
                    className="text-[11px] text-[#767676] border border-[#F0EBE8] rounded px-1 py-1 bg-white cursor-pointer max-w-[180px]"
                    title="다른 그룹으로 이동"
                  >
                    <option value="">이동</option>
                    {otherGroups.map((g) => (
                      <option key={g.groupId} value={g.groupId}>
                        {formatMoveOption(g, allGroups)}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => m.memberId && onExclude(m.memberId)}
                  className="text-[#C8392B] hover:bg-[#FDECEA] rounded p-1"
                  title="그룹에서 제외"
                >
                  <UserX size={14} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 식당 + 확정 */}
      <div className="px-4 py-3 border-t border-[#F0EBE8] flex flex-col gap-2 bg-[#FAF8F6]">
        <input
          value={restaurantName}
          onChange={(e) => setRestaurantName(e.target.value)}
          placeholder="식당명"
          className="w-full px-3 py-2 rounded-input border border-[#F0EBE8] bg-white text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          value={restaurantAddress}
          onChange={(e) => setRestaurantAddress(e.target.value)}
          placeholder="식당 주소"
          className="w-full px-3 py-2 rounded-input border border-[#F0EBE8] bg-white text-[13px] focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSaveRestaurant(group.groupId, restaurantName, restaurantAddress)}
            disabled={!restaurantDirty}
            className="flex-1 px-3 py-2 rounded-input text-[13px] font-medium border border-primary text-primary hover:bg-primary-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            식당 저장
          </button>
          {!isConfirmed ? (
            <button
              onClick={() => onConfirm(group.groupId)}
              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-input text-[13px] font-semibold bg-primary text-white hover:opacity-90 transition-opacity"
            >
              <CheckCircle2 size={14} />
              그룹 확정
            </button>
          ) : (
            <span className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-input text-[13px] font-semibold bg-[#E8F5E9] text-[#4CAF50]">
              <CheckCircle2 size={14} />
              확정됨
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function getGroupLabel(index: number) {
  return `그룹 ${index + 1}`
}

function formatFitPercent(score: number | null) {
  if (score == null) return null
  return Math.round(Number(score) * 100)
}

function formatMoveOption(group: MatchingGroupView, allGroups: MatchingGroupView[]) {
  const index = allGroups.findIndex((g) => g.groupId === group.groupId)
  const names = group.members
    .map((member) => member.name)
    .filter(Boolean)
    .slice(0, 2)
    .join(', ')
  return `${getGroupLabel(index)} · ${dayjs(group.eventDate).format('M/D')}${names ? ` · ${names}` : ''}`
}

// ─── 미배정 목록 ────────────────────────────────────────────────────────
interface UnmatchedListProps {
  members: MatchingMemberView[]
  groups: MatchingGroupView[]
  onMemberClick: (applicationId: string) => void
  onAssign: (groupId: string, applicationId: string) => void
}

function UnmatchedList({ members, groups, onMemberClick, onAssign }: UnmatchedListProps) {
  if (members.length === 0) return null

  return (
    <div className="bg-white rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#F0EBE8]">
        <span className="text-sm font-bold text-[#1A1A1A]">미배정 신청자 {members.length}명</span>
        <span className="text-xs text-[#767676] ml-2">그룹에 직접 배정할 수 있어요.</span>
      </div>
      <div className="px-2 py-2 flex flex-col gap-1">
        {members.map((m) => (
          <div
            key={m.applicationId}
            className="flex items-center gap-2 px-2 py-2 rounded-input hover:bg-[#F5F0EB] transition-colors"
          >
            <button onClick={() => onMemberClick(m.applicationId)} className="flex-1 text-left min-w-0">
              <span className="text-[14px] font-medium text-[#1A1A1A] hover:underline">{m.name ?? '-'}</span>
              <span className="text-[12px] text-[#767676] ml-2">{m.phone ?? ''}</span>
            </button>
            {groups.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) onAssign(e.target.value, m.applicationId)
                }}
                className="text-[11px] text-[#767676] border border-[#F0EBE8] rounded px-1 py-1 bg-white cursor-pointer max-w-[180px]"
                title="그룹에 배정"
              >
                <option value="">그룹 배정</option>
                {groups.map((g) => (
                  <option key={g.groupId} value={g.groupId}>
                    {formatMoveOption(g, groups)}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
