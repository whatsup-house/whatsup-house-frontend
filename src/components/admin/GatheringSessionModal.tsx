'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import dayjs from 'dayjs'
import { X } from 'lucide-react'
import type { AdminSessionRequest, GatheringType } from '@/lib/api/types'
import {
  useAdminLocations,
  useCreateSessions,
  useRandomTableGatheringTypes,
  useUpdateSession,
} from '@/lib/hooks/useAdminGathering'
import { useUpdateSessionVenues } from '@/lib/hooks/useAdminDining'
import DiningVenuePoolPicker from '@/components/admin/DiningVenuePoolPicker'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

// 빈 입력은 null(가격 → 종류 기본 가격, 마감 → 마감 없음, 우연한 식탁 규칙 → 매칭 규칙 기본값)
const toNullableNumber = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v))

const SELECT_CLASS =
  'w-full h-[52px] px-4 border border-tag-bg rounded-input text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary'

// 날짜는 오늘 이후만 (BE도 같은 검증). 시간 순서는 새벽 종료 케이스 때문에 검증하지 않는다. (KAN-221)
// 주간 반복 종료일은 BE와 같이 회차 날짜부터 1년 이내. (KAN-338)
// 우연한 식탁 전용 필드는 RANDOM_TABLE일 때만 검사한다. 범위는 BE 매칭 규칙 설정과 같다. (KAN-351)
const buildSchema = (isDining: boolean) => z.object({
  eventDate: z.string().min(1, '날짜를 선택해주세요'),
  startTime: z.string().min(1, '시작 시간을 입력해주세요'),
  endTime: z.string().min(1, '종료 시간을 입력해주세요'),
  locationId: z.string().min(1, '장소를 선택해주세요'),
  maxAttendees: z.number({ error: '정원을 입력해주세요' }).int().min(1, '정원은 1명 이상이어야 합니다').max(30, '정원은 최대 30명입니다'),
  priceOverride: z.number().min(0, '가격은 0원 이상이어야 합니다').nullable(),
  applyDeadlineAt: z.string(),
  repeat: z.boolean(),
  until: z.string(),
  matchRunAt: z.string(),
  autoConfirmGraceMinutes: z.number().int('분 단위 정수로 입력해주세요').min(0, '유예는 0분 이상이어야 합니다').max(10080, '유예는 최대 10080분(7일)입니다').nullable(),
  tableSizeMin: z.number({ error: '최소 인원을 입력해주세요' }).int().min(2, '테이블은 2명 이상이어야 합니다').max(8, '테이블은 최대 8명입니다'),
  tableSizeMax: z.number({ error: '최대 인원을 입력해주세요' }).int().min(2, '테이블은 2명 이상이어야 합니다').max(8, '테이블은 최대 8명입니다'),
  minGroupScore: z.number().min(0, '0~1 사이로 입력해주세요').max(1, '0~1 사이로 입력해주세요').nullable(),
  maxAgeGap: z.number().int('정수로 입력해주세요').min(0, '0 이상이어야 합니다').max(100, '최대 100입니다').nullable(),
}).superRefine((val, ctx) => {
  if (val.eventDate && val.eventDate < dayjs().format('YYYY-MM-DD')) {
    ctx.addIssue({ code: 'custom', path: ['eventDate'], message: '날짜는 오늘 이후로 선택해주세요.' })
  }
  if (isDining) {
    // datetime-local(YYYY-MM-DDTHH:mm)과 날짜+시작 시간을 같은 형식으로 맞춰 문자열로 비교한다.
    if (!val.matchRunAt) {
      ctx.addIssue({ code: 'custom', path: ['matchRunAt'], message: '매칭 실행 시각을 입력해주세요.' })
    } else if (val.eventDate && val.startTime && val.matchRunAt >= `${val.eventDate}T${val.startTime}`) {
      ctx.addIssue({ code: 'custom', path: ['matchRunAt'], message: '매칭 실행은 모임 시작 전이어야 해요.' })
    }
    if (val.tableSizeMin > val.tableSizeMax) {
      ctx.addIssue({ code: 'custom', path: ['tableSizeMax'], message: '최대 인원은 최소 인원 이상이어야 해요.' })
    }
  }
  if (!val.repeat) return
  if (!val.until) {
    ctx.addIssue({ code: 'custom', path: ['until'], message: '반복 종료일을 선택해주세요.' })
  } else if (val.eventDate && (val.until < val.eventDate || val.until > dayjs(val.eventDate).add(1, 'year').format('YYYY-MM-DD'))) {
    ctx.addIssue({ code: 'custom', path: ['until'], message: '반복 종료일은 회차 날짜부터 1년 이내로 선택해주세요.' })
  }
})

type FormValues = z.infer<ReturnType<typeof buildSchema>>

interface GatheringSessionModalProps {
  // null이면 우연한 식탁 종류 중에서 고른다(운영 대시보드). 하나면 자동 선택 (KAN-351)
  gatheringId: string | null
  // RANDOM_TABLE이면 우연한 식탁 전용 필드·식당 풀을 노출하고 보낸다. 다른 타입이면 보내지 않는다 (KAN-351)
  gatheringType: GatheringType | null
  // 수정할 회차. null이면 회차 추가(주간 반복 옵션 노출)
  editing: { sessionId: string; values: AdminSessionRequest } | null
  onClose: () => void
}

// 회차 추가·수정 모달 — 종류 상세(KAN-340)와 우연한 식탁 운영 대시보드(KAN-351)가 함께 쓴다.
export default function GatheringSessionModal({ gatheringId, gatheringType, editing, onClose }: GatheringSessionModalProps) {
  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), [])
  const isDining = gatheringType === 'RANDOM_TABLE'
  const schema = useMemo(() => buildSchema(isDining), [isDining])
  const { data: locations } = useAdminLocations()

  const diningTypes = useRandomTableGatheringTypes(gatheringId === null)
  const [pickedGatheringId, setPickedGatheringId] = useState('')
  const targetGatheringId =
    gatheringId ?? (diningTypes.types.length === 1 ? diningTypes.types[0].id : pickedGatheringId)

  // 식당 풀: venueId → 수용 테이블 수. 회차 id가 생긴 뒤 따로 저장한다.
  const [pool, setPool] = useState<Record<string, number>>({})
  const { mutate: saveVenues, isPending: isSavingVenues } = useUpdateSessionVenues()

  // 풀이 비어 있으면 건드리지 않는다(수정 시 기존 풀 유지). 새 회차는 풀 저장이 실패해도 닫는다 — 다시 저장하면 회차가 중복된다.
  const savePoolThenClose = (sessionIds: string[], closeOnError: boolean) => {
    const body = Object.entries(pool).map(([venueId, capacityTables]) => ({ venueId, capacityTables }))
    if (!isDining || body.length === 0) return onClose()
    saveVenues({ sessionIds, venues: body }, { onSuccess: onClose, onError: closeOnError ? onClose : undefined })
  }

  const { mutate: createSessions, isPending: isCreating } = useCreateSessions(targetGatheringId, (created) =>
    savePoolThenClose(created.map((s) => s.id), true))
  const { mutate: updateSession, isPending: isUpdating } = useUpdateSession(() =>
    savePoolThenClose(editing ? [editing.sessionId] : [], false))

  const initial = editing?.values
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      eventDate: initial?.eventDate ?? '',
      startTime: initial?.startTime ?? '',
      endTime: initial?.endTime ?? '',
      locationId: initial?.locationId ?? '',
      maxAttendees: initial?.maxAttendees,
      priceOverride: initial?.priceOverride ?? null,
      applyDeadlineAt: initial?.applyDeadlineAt ?? '',
      repeat: false,
      until: '',
      matchRunAt: initial?.matchRunAt ?? '',
      autoConfirmGraceMinutes: initial?.autoConfirmGraceMinutes ?? null,
      tableSizeMin: initial?.tableSizeMin ?? 4,
      tableSizeMax: initial?.tableSizeMax ?? 6,
      minGroupScore: initial?.minGroupScore ?? null,
      maxAgeGap: initial?.maxAgeGap ?? null,
    },
  })

  const [eventDate, repeat, until] = useWatch({ control, name: ['eventDate', 'repeat', 'until'] })
  // BE와 같은 계산: 기준 날짜부터 until까지 7일 간격 (ChronoUnit.WEEKS + 1)
  const repeatCount = repeat && eventDate && until >= eventDate ? dayjs(until).diff(eventDate, 'week') + 1 : 0

  const onSubmit = (v: FormValues) => {
    const body: AdminSessionRequest = {
      eventDate: v.eventDate,
      startTime: v.startTime,
      endTime: v.endTime,
      locationId: v.locationId,
      maxAttendees: v.maxAttendees,
      priceOverride: v.priceOverride,
      applyDeadlineAt: v.applyDeadlineAt || null,
      ...(isDining
        ? {
            matchRunAt: v.matchRunAt,
            autoConfirmGraceMinutes: v.autoConfirmGraceMinutes,
            tableSizeMin: v.tableSizeMin,
            tableSizeMax: v.tableSizeMax,
            minGroupScore: v.minGroupScore,
            maxAgeGap: v.maxAgeGap,
          }
        : {}),
    }
    if (editing) {
      updateSession({ sessionId: editing.sessionId, data: body })
    } else {
      createSessions(v.repeat ? { base: body, repeatWeekly: { until: v.until } } : body)
    }
  }

  const renderGatheringPicker = () => {
    if (diningTypes.isLoading) return <p className="text-sm text-tag-text">종류를 불러오는 중…</p>
    if (diningTypes.isError) return <p className="text-sm text-primary">종류를 불러오지 못했어요. 창을 닫고 다시 시도해주세요.</p>
    if (diningTypes.types.length === 0) {
      return (
        <p className="text-sm text-tag-text">
          우연한 식탁 종류가 없어요.{' '}
          <Link href="/admin/gatherings" className="text-primary underline">게더링 관리</Link>
          에서 종류를 만들고 첫 회차를 추가해주세요.
        </p>
      )
    }
    if (diningTypes.types.length === 1) return <p className="text-sm text-foreground">{diningTypes.types[0].title}</p>
    return (
      <select value={pickedGatheringId} onChange={(e) => setPickedGatheringId(e.target.value)} className={SELECT_CLASS}>
        <option value="">종류를 선택해주세요</option>
        {diningTypes.types.map((type) => (
          <option key={type.id} value={type.id}>{type.title}</option>
        ))}
      </select>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-card w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-tag-bg flex items-center justify-between">
          <h3 className="font-bold text-base text-foreground">{editing ? '회차 수정' : '회차 추가'}</h3>
          <button onClick={onClose} className="text-tag-text hover:text-foreground" aria-label="닫기"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {gatheringId === null && (
            <div>
              <p className="text-sm font-medium text-foreground mb-1">우연한 식탁 종류 *</p>
              {renderGatheringPicker()}
            </div>
          )}

          <Input label="날짜 *" type="date" min={today} error={errors.eventDate?.message} {...register('eventDate')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="시작 시간 *" type="time" error={errors.startTime?.message} {...register('startTime')} />
            <Input label="종료 시간 *" type="time" error={errors.endTime?.message} {...register('endTime')} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">{isDining ? '지역' : '장소'} *</label>
            <select className={SELECT_CLASS} {...register('locationId')}>
              <option value="">{isDining ? '지역을' : '장소를'} 선택해주세요</option>
              {locations?.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            {errors.locationId && <p className="text-xs text-primary mt-1">{errors.locationId.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="정원 (최대 30) *"
              type="number"
              min={1}
              max={30}
              error={errors.maxAttendees?.message}
              {...register('maxAttendees', { valueAsNumber: true })}
            />
            <Input
              label="회차 가격 (원)"
              type="number"
              min={0}
              placeholder="비우면 기본 가격"
              error={errors.priceOverride?.message}
              {...register('priceOverride', { setValueAs: toNullableNumber })}
            />
          </div>

          <div>
            <Input label="신청 마감" type="datetime-local" {...register('applyDeadlineAt')} />
            <p className="text-xs text-tag-text mt-1">비우면 마감 없이 받아요.</p>
          </div>

          {isDining && (
            <div className="rounded-input border border-tag-bg p-3 flex flex-col gap-3">
              <p className="text-sm font-bold text-foreground">매칭</p>
              <div>
                <Input label="매칭 실행 시각 *" type="datetime-local" error={errors.matchRunAt?.message} {...register('matchRunAt')} />
                <p className="text-xs text-tag-text mt-1">이 시각에 모집을 마감하고 테이블을 자동으로 짜요.</p>
              </div>
              <div>
                <Input
                  label="자동 확정 유예 (분)"
                  type="number"
                  min={0}
                  max={10080}
                  placeholder="비우면 기본값"
                  error={errors.autoConfirmGraceMinutes?.message}
                  {...register('autoConfirmGraceMinutes', { setValueAs: toNullableNumber })}
                />
                <p className="text-xs text-tag-text mt-1">테이블을 제안하고 이 시간이 지나면 자동 확정해요. 0이면 바로 확정해요.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="테이블 최소 인원 *"
                  type="number"
                  min={2}
                  max={8}
                  error={errors.tableSizeMin?.message}
                  {...register('tableSizeMin', { valueAsNumber: true })}
                />
                <Input
                  label="테이블 최대 인원 *"
                  type="number"
                  min={2}
                  max={8}
                  error={errors.tableSizeMax?.message}
                  {...register('tableSizeMax', { valueAsNumber: true })}
                />
                <Input
                  label="최소 그룹 점수 (0~1)"
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  placeholder="비우면 기본값"
                  error={errors.minGroupScore?.message}
                  {...register('minGroupScore', { setValueAs: toNullableNumber })}
                />
                <Input
                  label="최대 나이 차"
                  type="number"
                  min={0}
                  max={100}
                  placeholder="비우면 기본값"
                  error={errors.maxAgeGap?.message}
                  {...register('maxAgeGap', { setValueAs: toNullableNumber })}
                />
              </div>
            </div>
          )}

          {isDining && (
            <div className="rounded-input border border-tag-bg p-3 flex flex-col gap-2">
              <p className="text-sm font-bold text-foreground">식당 풀</p>
              <p className="text-xs text-tag-text">
                {editing
                  ? '고르면 기존 식당 풀을 이 목록으로 바꿔요. 아무것도 고르지 않으면 그대로 둬요.'
                  : '확정된 테이블에 고른 식당을 수용 테이블 수만큼 차례로 배정해요.'}
              </p>
              <DiningVenuePoolPicker pool={pool} onChange={setPool} />
            </div>
          )}

          {!editing && (
            <div className="rounded-input border border-tag-bg p-3 flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input type="checkbox" className="h-4 w-4 accent-primary" {...register('repeat')} />
                매주 반복
              </label>
              {repeat && (
                <>
                  <Input
                    label="반복 종료일 *"
                    type="date"
                    min={eventDate || today}
                    error={errors.until?.message}
                    {...register('until')}
                  />
                  {repeatCount > 0 && (
                    <p className="text-xs text-tag-text">
                      같은 요일·시간으로 {repeatCount}개 회차를 만들어요. 신청 마감{isDining && '·매칭 실행 시각'}도 한 주씩 밀려요.
                      {isDining && ' 식당 풀은 모든 회차에 똑같이 들어가요.'}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-tag-bg">
          <Button variant="ghost" type="button" onClick={onClose} className="flex-1">취소</Button>
          <Button
            variant="primary"
            type="button"
            disabled={!targetGatheringId}
            isLoading={isCreating || isUpdating || isSavingVenues}
            onClick={handleSubmit(onSubmit)}
            className="flex-1"
          >
            저장하기
          </Button>
        </div>
      </div>
    </div>
  )
}
