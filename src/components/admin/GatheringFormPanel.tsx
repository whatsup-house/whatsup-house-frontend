'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import dayjs from 'dayjs'
import type { AdminGatheringListItem, GatheringCreateRequest, GatheringType } from '@/lib/api/adminGathering'
import { useAdminLocations, useAdminGatheringDetail, useCreateGathering, useUpdateGathering } from '@/lib/hooks/useAdminGathering'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

// 날짜는 오늘 이후, 시작 시간은 종료 시간보다 빨라야 한다(백엔드와 동일 정책). (KAN-221)
const schema = z.object({
  title: z.string().min(1, '게더링명을 입력해주세요'),
  description: z.string().min(1, '게더링 소개를 입력해주세요'),
  howToRunText: z.string().optional(),
  locationId: z.string().min(1, '장소를 선택해주세요'),
  date: z.string().min(1, '날짜를 선택해주세요'),
  startTime: z.string().min(1, '시작 시간을 입력해주세요'),
  endTime: z.string().min(1, '종료 시간을 입력해주세요'),
  price: z.number({ error: '참가비를 입력해주세요' }).min(0, '참가비는 0원 이상이어야 합니다'),
  capacity: z.number({ error: '정원을 입력해주세요' }).int().min(1).max(20, '정원은 최대 20명입니다'),
  thumbnailUrl: z.string().optional(),
  moodTagsText: z.string().optional(),
  mileageReward: z.number().optional(),
}).superRefine((val, ctx) => {
  const today = dayjs().format('YYYY-MM-DD')
  if (val.date && val.date < today) {
    ctx.addIssue({ code: 'custom', path: ['date'], message: '게더링 날짜는 오늘 이후로 선택해주세요.' })
  }
  if (val.startTime && val.endTime && val.startTime >= val.endTime) {
    ctx.addIssue({ code: 'custom', path: ['endTime'], message: '시작 시간은 종료 시간보다 빨라야 합니다.' })
  }
})

type FormValues = z.infer<typeof schema>

interface GatheringFormPanelProps {
  gathering: AdminGatheringListItem | null
  onClose: () => void
  onSuccess: () => void
}

export function GatheringFormPanel({ gathering, onClose, onSuccess }: GatheringFormPanelProps) {
  const isEdit = !!gathering

  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), [])
  const { data: locations } = useAdminLocations()
  // 수정 시 상세를 조회해 소개/장소 등 목록에 없는 필드까지 prefill 한다. (KAN-220)
  const { data: detail } = useAdminGatheringDetail(gathering?.id)
  const { mutate: createGathering, isPending: isCreating } = useCreateGathering(onSuccess)
  const { mutate: updateGathering, isPending: isUpdating } = useUpdateGathering(onSuccess)
  const isPending = isCreating || isUpdating

  // 게더링 유형 (생성 시에만 설정 가능, 수정은 백엔드에서 무시)
  const [gatheringType, setGatheringType] = useState<GatheringType>('REGULAR')

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      price: 0,
      capacity: 1,
      mileageReward: 500,
      thumbnailUrl: '',
      howToRunText: '',
      moodTagsText: '',
    },
  })

  useEffect(() => {
    if (!gathering) {
      reset()
      return
    }
    // 목록 데이터로 우선 채우고
    setValue('title', gathering.title)
    setValue('date', gathering.date)
    setValue('startTime', gathering.startTime.slice(0, 5))
    setValue('endTime', gathering.endTime?.slice(0, 5) ?? '')
    setValue('price', gathering.price)
    setValue('capacity', gathering.capacity)
    setValue('thumbnailUrl', gathering.thumbnailUrl ?? '')
  }, [gathering, setValue, reset])

  // 상세가 도착하면 소개/장소/시간/썸네일을 상세 기준으로 채운다. (KAN-220)
  useEffect(() => {
    if (!detail) return
    setValue('description', detail.description ?? '')
    setValue('locationId', detail.location?.id ?? '')
    if (detail.startTime) setValue('startTime', detail.startTime.slice(0, 5))
    if (detail.endTime) setValue('endTime', detail.endTime.slice(0, 5))
    setValue('thumbnailUrl', detail.thumbnailUrl ?? '')
  }, [detail, setValue])

  const onSubmit = (values: FormValues) => {
    const data: GatheringCreateRequest = {
      title: values.title,
      description: values.description,
      locationId: values.locationId,
      date: values.date,
      startTime: values.startTime,
      endTime: values.endTime,
      price: values.price,
      capacity: values.capacity,
      thumbnailUrl: values.thumbnailUrl || undefined,
      mileageReward: values.mileageReward ?? 500,
      howToRun: values.howToRunText ? values.howToRunText.split('\n').filter(Boolean) : [],
      moodTags: values.moodTagsText ? values.moodTagsText.split(',').map((t) => t.trim()).filter(Boolean) : [],
    }

    if (isEdit) {
      updateGathering({ id: gathering.id, data })
    } else {
      createGathering({ ...data, gatheringType })
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 w-[480px] h-full bg-card shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-tag-bg">
          <h2 className="font-bold text-[18px] text-foreground">{isEdit ? '게더링 수정' : '게더링 추가'}</h2>
          <button onClick={onClose} className="text-tag-text text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-4">
            {!isEdit && (
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">게더링 유형 *</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'REGULAR', label: '일반', desc: '신청만 받음' },
                    { value: 'RANDOM_TABLE', label: '우연한 식탁', desc: '자동매칭' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGatheringType(opt.value)}
                      className={`flex flex-col items-start px-4 py-3 rounded-input border text-left transition-colors ${
                        gatheringType === opt.value
                          ? 'border-primary bg-primary-light'
                          : 'border-tag-bg bg-card'
                      }`}
                    >
                      <span className={`text-sm font-semibold ${gatheringType === opt.value ? 'text-primary' : 'text-foreground'}`}>
                        {opt.label}
                      </span>
                      <span className="text-xs text-tag-text mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
                {gatheringType === 'RANDOM_TABLE' && (
                  <p className="text-xs text-tag-text mt-1.5">
                    생성 후 신청폼에서 매칭 질문(나이·성별·관심사 등)을 추가하면 자동매칭을 사용할 수 있어요.
                  </p>
                )}
              </div>
            )}

            <Input
              label="게더링명 *"
              placeholder="게더링 이름을 입력해주세요"
              error={errors.title?.message}
              {...register('title')}
            />

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">게더링 소개 *</label>
              <textarea
                className="w-full h-[100px] px-4 py-3 border border-tag-bg rounded-input text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="게더링에 대해 소개해주세요"
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">진행 방식 (줄바꿈으로 구분)</label>
              <textarea
                className="w-full h-[80px] px-4 py-3 border border-tag-bg rounded-input text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={'1단계 내용\n2단계 내용'}
                {...register('howToRunText')}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">장소 *</label>
              <select
                className="w-full h-[52px] px-4 border border-tag-bg rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                {...register('locationId')}
              >
                <option value="">장소를 선택해주세요</option>
                {locations?.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              {errors.locationId && (
                <p className="text-xs text-red-500 mt-1">{errors.locationId.message}</p>
              )}
            </div>

            <Input
              label="날짜 *"
              type="date"
              min={today}
              error={errors.date?.message}
              {...register('date')}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="시작 시간 *"
                type="time"
                error={errors.startTime?.message}
                {...register('startTime')}
              />
              <Input
                label="종료 시간 *"
                type="time"
                error={errors.endTime?.message}
                {...register('endTime')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="참가비 (원) *"
                type="number"
                min={0}
                error={errors.price?.message}
                {...register('price', { valueAsNumber: true })}
              />
              <Input
                label="모집 정원 (최대 20) *"
                type="number"
                min={1}
                max={20}
                error={errors.capacity?.message}
                {...register('capacity', { valueAsNumber: true })}
              />
            </div>

            <Input
              label="썸네일 URL"
              placeholder="https://example.com/image.jpg"
              error={errors.thumbnailUrl?.message}
              {...register('thumbnailUrl')}
            />

            <Input
              label="분위기 태그 (쉼표 구분)"
              placeholder="조용한,감성적인"
              {...register('moodTagsText')}
            />

            <Input
              label="마일리지 적립"
              type="number"
              placeholder="500"
              {...register('mileageReward', { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-tag-bg">
          <Button variant="ghost" type="button" onClick={onClose} className="flex-1">취소</Button>
          <Button
            variant="primary"
            type="button"
            isLoading={isPending}
            onClick={handleSubmit(onSubmit)}
            className="flex-1"
          >
            저장하기
          </Button>
        </div>
      </div>
    </>
  )
}
