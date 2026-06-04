'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { AdminGatheringListItem, GatheringCreateRequest } from '@/lib/api/adminGathering'
import { useAdminLocations, useCreateGathering, useUpdateGathering } from '@/lib/hooks/useAdminGathering'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

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
})

type FormValues = z.infer<typeof schema>

interface GatheringFormPanelProps {
  gathering: AdminGatheringListItem | null
  onClose: () => void
  onSuccess: () => void
}

export function GatheringFormPanel({ gathering, onClose, onSuccess }: GatheringFormPanelProps) {
  const isEdit = !!gathering

  const { data: locations } = useAdminLocations()
  const { mutate: createGathering, isPending: isCreating } = useCreateGathering(onSuccess)
  const { mutate: updateGathering, isPending: isUpdating } = useUpdateGathering(onSuccess)
  const isPending = isCreating || isUpdating

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
    if (gathering) {
      setValue('title', gathering.title)
      setValue('date', gathering.date)
      setValue('startTime', gathering.startTime.slice(0, 5))
      setValue('endTime', gathering.endTime?.slice(0, 5) ?? '')
      setValue('price', gathering.price)
      setValue('capacity', gathering.capacity)
      setValue('thumbnailUrl', gathering.thumbnailUrl ?? '')
    } else {
      reset()
    }
  }, [gathering, setValue, reset])

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
      createGathering(data)
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
