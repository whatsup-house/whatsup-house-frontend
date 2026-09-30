'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useController, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import AdminUserSearch from './AdminUserSearch'
import { useChatSourceGatherings, useCreateChatRoom, useDiningTableGroups, useLoadSourceMembers } from '@/lib/hooks/useAdminChat'
import type { ChatSourceMember, ChatSourceType } from '@/lib/api/types'

const schema = z.object({
  name: z.string().trim().min(1, '방 이름을 입력해주세요').max(100, '방 이름은 100자 이하로 입력해주세요'),
  members: z
    .array(z.object({ userId: z.string(), nickname: z.string() }))
    .min(1, '멤버를 1명 이상 추가해주세요'),
})

type FormValues = z.infer<typeof schema>

const SELECT_CLASS =
  'h-11 w-full rounded-input border border-tag-bg bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary'

interface ChatGroupRoomFormPanelProps {
  onClose: () => void
}

export default function ChatGroupRoomFormPanel({ onClose }: ChatGroupRoomFormPanelProps) {
  const router = useRouter()
  const createRoom = useCreateChatRoom()
  const loadMembers = useLoadSourceMembers()
  const { data: gatherings = [] } = useChatSourceGatherings()

  const [sourceType, setSourceType] = useState<ChatSourceType | ''>('')
  const [gatheringId, setGatheringId] = useState('')
  const [groupId, setGroupId] = useState('')
  // 우연한 식탁은 게더링 → 조 순서로 고른다
  const { data: matching } = useDiningTableGroups(sourceType === 'DINING_TABLE' ? gatheringId : '')

  const { register, control, getValues, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', members: [] },
  })
  const { field: membersField } = useController({ name: 'members', control })
  const members = membersField.value

  // 불러오기 응답이 늦게 와도 그 사이 추가한 멤버를 잃지 않게 현재 값을 다시 읽는다
  const addMembers = (incoming: ChatSourceMember[]) => {
    const current = getValues('members')
    const known = new Set(current.map((m) => m.userId))
    const fresh = incoming.filter((m) => !known.has(m.userId))
    if (fresh.length > 0) membersField.onChange([...current, ...fresh])
  }

  const loadFrom = (type: ChatSourceType, id: string) => {
    if (!id) return
    loadMembers.mutate({ type, id }, { onSuccess: addMembers })
  }

  const sourceId = sourceType === 'GATHERING' ? gatheringId : groupId

  const onSubmit = (values: FormValues) => {
    createRoom.mutate(
      {
        name: values.name,
        memberIds: values.members.map((m) => m.userId),
        ...(sourceType && sourceId ? { sourceType, sourceId } : {}),
      },
      { onSuccess: ({ roomId }) => router.push(`/admin/chat/${roomId}`) },
    )
  }

  const sortedGatherings = [...gatherings].sort((a, b) => b.date.localeCompare(a.date))
  const groups = matching?.groups.filter((group) => group.status !== 'CANCELLED')

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col bg-card shadow-2xl sm:w-[480px]">
        <div className="flex items-center justify-between border-b border-tag-bg px-6 py-4">
          <h2 className="text-[18px] font-bold text-foreground">단체방 만들기</h2>
          <button type="button" onClick={onClose} className="text-tag-text" aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-4">
          <Input
            label="방 이름"
            requiredMark
            maxLength={100}
            placeholder="예: 10월 재즈 게더링"
            error={formState.errors.name?.message}
            {...register('name')}
          />

          <section className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">멤버 불러오기</p>
            <select
              value={sourceType}
              onChange={(e) => {
                setSourceType(e.target.value as ChatSourceType | '')
                setGatheringId('')
                setGroupId('')
              }}
              className={SELECT_CLASS}
            >
              <option value="">불러오지 않음</option>
              <option value="GATHERING">게더링 참가 확정자</option>
              <option value="DINING_TABLE">우연한 식탁 조원</option>
            </select>
            {sourceType && (
              <select
                value={gatheringId}
                onChange={(e) => {
                  setGatheringId(e.target.value)
                  setGroupId('')
                  if (sourceType === 'GATHERING') loadFrom('GATHERING', e.target.value)
                }}
                className={SELECT_CLASS}
              >
                <option value="">게더링 선택</option>
                {sortedGatherings.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.date} · {g.title}
                  </option>
                ))}
              </select>
            )}
            {sourceType === 'DINING_TABLE' && gatheringId && (
              <select
                value={groupId}
                onChange={(e) => {
                  setGroupId(e.target.value)
                  loadFrom('DINING_TABLE', e.target.value)
                }}
                className={SELECT_CLASS}
              >
                <option value="">{groups && groups.length === 0 ? '매칭된 조가 없어요' : '조 선택'}</option>
                {groups?.map((group, index) => (
                  <option key={group.groupId} value={group.groupId}>
                    {index + 1}조{group.restaurantName ? ` · ${group.restaurantName}` : ''} · {group.members.length}명
                  </option>
                ))}
              </select>
            )}
            {loadMembers.isPending && <p className="text-xs text-tag-text">멤버를 불러오는 중…</p>}
          </section>

          <section className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">닉네임으로 추가</p>
            <AdminUserSearch
              renderActions={(user) => {
                const isAdded = members.some((m) => m.userId === user.id)
                return (
                  <button
                    type="button"
                    disabled={isAdded}
                    onClick={() => addMembers([{ userId: user.id, nickname: user.nickname }])}
                    className="rounded-input border border-primary px-2.5 py-1 text-xs font-medium text-primary disabled:border-tag-bg disabled:text-tag-text"
                  >
                    {isAdded ? '추가됨' : '추가'}
                  </button>
                )
              }}
            />
          </section>

          <section className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">
              선택한 멤버 <span className="font-normal text-tag-text">{members.length}명</span>
            </p>
            {members.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {members.map((member) => (
                  <li
                    key={member.userId}
                    className="flex items-center gap-1 rounded-full bg-tag-bg py-1 pl-3 pr-1.5 text-xs text-tag-text"
                  >
                    {member.nickname}
                    <button
                      type="button"
                      onClick={() => membersField.onChange(members.filter((m) => m.userId !== member.userId))}
                      className="flex h-4 w-4 items-center justify-center"
                      aria-label={`${member.nickname} 제거`}
                    >
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-tag-text">나(방을 만든 관리자)는 자동으로 들어가요.</p>
            )}
            {formState.errors.members?.message && (
              <p className="text-xs text-primary">{formState.errors.members.message}</p>
            )}
          </section>
        </div>

        <div className="flex gap-3 border-t border-tag-bg px-6 py-4">
          <Button variant="ghost" type="button" onClick={onClose} className="flex-1">
            취소
          </Button>
          <Button
            variant="primary"
            type="button"
            isLoading={createRoom.isPending}
            onClick={handleSubmit(onSubmit)}
            className="flex-1"
          >
            만들기
          </Button>
        </div>
      </div>
    </>
  )
}
