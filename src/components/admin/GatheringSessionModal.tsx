'use client'

import { useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import dayjs from 'dayjs'
import { X } from 'lucide-react'
import type { AdminSessionRequest } from '@/lib/api/types'
import { useAdminLocations, useCreateSessions, useUpdateSession } from '@/lib/hooks/useAdminGathering'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

// 빈 입력은 null(가격 → 종류 기본 가격, 마감 → 마감 없음)
const toNullableNumber = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v))

// 날짜는 오늘 이후만 (BE도 같은 검증). 시간 순서는 새벽 종료 케이스 때문에 검증하지 않는다. (KAN-221)
// 주간 반복 종료일은 BE와 같이 회차 날짜부터 1년 이내. (KAN-338)
const schema = z.object({
  eventDate: z.string().min(1, '날짜를 선택해주세요'),
  startTime: z.string().min(1, '시작 시간을 입력해주세요'),
  endTime: z.string().min(1, '종료 시간을 입력해주세요'),
  locationId: z.string().min(1, '장소를 선택해주세요'),
  maxAttendees: z.number({ error: '정원을 입력해주세요' }).int().min(1, '정원은 1명 이상이어야 합니다').max(30, '정원은 최대 30명입니다'),
  priceOverride: z.number().min(0, '가격은 0원 이상이어야 합니다').nullable(),
  applyDeadlineAt: z.string(),
  repeat: z.boolean(),
  until: z.string(),
}).superRefine((val, ctx) => {
  if (val.eventDate && val.eventDate < dayjs().format('YYYY-MM-DD')) {
    ctx.addIssue({ code: 'custom', path: ['eventDate'], message: '날짜는 오늘 이후로 선택해주세요.' })
  }
  if (!val.repeat) return
  if (!val.until) {
    ctx.addIssue({ code: 'custom', path: ['until'], message: '반복 종료일을 선택해주세요.' })
  } else if (val.eventDate && (val.until < val.eventDate || val.until > dayjs(val.eventDate).add(1, 'year').format('YYYY-MM-DD'))) {
    ctx.addIssue({ code: 'custom', path: ['until'], message: '반복 종료일은 회차 날짜부터 1년 이내로 선택해주세요.' })
  }
})

type FormValues = z.infer<typeof schema>

interface GatheringSessionModalProps {
  gatheringId: string
  // 수정할 회차. null이면 회차 추가(주간 반복 옵션 노출)
  editing: { sessionId: string; values: AdminSessionRequest } | null
  onClose: () => void
}

// 종류 상세의 회차 추가·수정 모달 (KAN-340)
export default function GatheringSessionModal({ gatheringId, editing, onClose }: GatheringSessionModalProps) {
  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), [])
  const { data: locations } = useAdminLocations()
  const { mutate: createSessions, isPending: isCreating } = useCreateSessions(gatheringId, onClose)
  const { mutate: updateSession, isPending: isUpdating } = useUpdateSession(onClose)

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
    }
    if (editing) {
      updateSession({ sessionId: editing.sessionId, data: body })
    } else {
      createSessions(v.repeat ? { base: body, repeatWeekly: { until: v.until } } : body)
    }
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
          <Input label="날짜 *" type="date" min={today} error={errors.eventDate?.message} {...register('eventDate')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="시작 시간 *" type="time" error={errors.startTime?.message} {...register('startTime')} />
            <Input label="종료 시간 *" type="time" error={errors.endTime?.message} {...register('endTime')} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">장소 *</label>
            <select
              className="w-full h-[52px] px-4 border border-tag-bg rounded-input text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary"
              {...register('locationId')}
            >
              <option value="">장소를 선택해주세요</option>
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
                      같은 요일·시간으로 {repeatCount}개 회차를 만들어요. 신청 마감도 한 주씩 밀려요.
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
            isLoading={isCreating || isUpdating}
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
