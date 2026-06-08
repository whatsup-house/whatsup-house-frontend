'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { AdminHeroCarouselSlide, AdminHeroCarouselSlideRequest, HeroSlideType } from '@/lib/api/types'
import {
  useCreateCarouselSlide,
  useUpdateCarouselSlide,
  useDeleteCarouselSlide,
  useToggleCarouselSlide,
} from '@/lib/hooks/useAdminHeroCarousel'
import { useUploadImage } from '@/lib/hooks/useUploadImage'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ImageUploadField from '@/components/ui/ImageUploadField'

const schema = z.object({
  type: z.enum(['GATHERING', 'CALENDAR', 'STORY']),
  imageUrl: z.string().min(1, '이미지를 업로드해주세요'),
  title: z.string().min(1, '제목 텍스트를 입력해주세요'),
  content: z.string().optional(),
  gatheringId: z.string().optional(),
  sortOrder: z.number({ error: '순서를 입력해주세요' }).int().min(1, '1 이상이어야 합니다'),
})

type FormValues = z.infer<typeof schema>

const TYPE_LABELS: Record<HeroSlideType, string> = {
  GATHERING: '게더링 (GATHERING)',
  CALENDAR: '일정 캘린더 (CALENDAR)',
  STORY: '스토리 (STORY)',
}

interface HeroCarouselFormPanelProps {
  slide: AdminHeroCarouselSlide | null
  onClose: () => void
  onSuccess: () => void
}

export function HeroCarouselFormPanel({ slide, onClose, onSuccess }: HeroCarouselFormPanelProps) {
  const isEdit = !!slide
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isActive, setIsActive] = useState(slide?.isActive ?? true)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(slide?.imageUrl ?? null)
  // 새로 업로드한 이미지의 tempPath. 없으면(수정 시) 백엔드가 기존 이미지를 유지한다. (KAN-182/183)
  const [tempPath, setTempPath] = useState<string | null>(null)

  const { mutate: create, isPending: isCreating } = useCreateCarouselSlide(onSuccess)
  const { mutate: update, isPending: isUpdating } = useUpdateCarouselSlide(onSuccess)
  const { mutate: remove, isPending: isDeleting } = useDeleteCarouselSlide()
  const { mutate: toggle, isPending: isToggling } = useToggleCarouselSlide()
  const { uploadWithTempPath, isUploading } = useUploadImage()
  const isPending = isCreating || isUpdating

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'GATHERING', sortOrder: 1 },
  })

  const typeValue = watch('type')

  useEffect(() => {
    if (slide) {
      setValue('type', slide.type)
      setValue('imageUrl', slide.imageUrl)
      setValue('title', slide.title)
      setValue('content', slide.content ?? '')
      setValue('gatheringId', slide.gatheringId ?? '')
      setValue('sortOrder', slide.sortOrder)
      setIsActive(slide.isActive)
      setImagePreviewUrl(slide.imageUrl)
      setTempPath(null)
    } else {
      reset({ type: 'GATHERING', sortOrder: 1 })
      setIsActive(true)
      setImagePreviewUrl(null)
      setTempPath(null)
    }
  }, [slide, setValue, reset])

  const handleImageConfirm = async (blob: Blob) => {
    if (imagePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl)
    const localUrl = URL.createObjectURL(blob)
    setImagePreviewUrl(localUrl)
    setValue('imageUrl', '')

    try {
      const result = await uploadWithTempPath(blob, 'carousel.jpg')
      setImagePreviewUrl(result.previewUrl)
      setValue('imageUrl', result.previewUrl)
      setTempPath(result.tempPath)
    } catch {
      setImagePreviewUrl(slide?.imageUrl ?? null)
      setValue('imageUrl', slide?.imageUrl ?? '')
      setTempPath(null)
    }
  }

  const handleImageClear = () => {
    if (imagePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl)
    setImagePreviewUrl(null)
    setValue('imageUrl', '')
    setTempPath(null)
  }

  const onSubmit = (values: FormValues) => {
    // 이미지는 tempPath로 전송. 수정 시 새 이미지가 없으면 생략하여 기존 이미지를 유지한다.
    const data: AdminHeroCarouselSlideRequest = {
      type: values.type,
      title: values.title,
      content: values.content || undefined,
      gatheringId: values.gatheringId || undefined,
      sortOrder: values.sortOrder,
      ...(tempPath ? { tempPath } : {}),
    }
    if (isEdit) {
      update({ id: slide.id, data })
    } else {
      create(data)
    }
  }

  const handleToggle = () => {
    if (!slide) return
    toggle(
      { id: slide.id, isActive: !isActive },
      { onSuccess: () => setIsActive((prev) => !prev) },
    )
  }

  const handleDelete = () => {
    if (!slide) return
    remove(slide.id, { onSuccess: onSuccess })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 w-[480px] h-full bg-card shadow-2xl z-50 flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-tag-bg">
          <h2 className="font-bold text-[18px] text-foreground">
            {isEdit ? '슬라이드 수정' : '슬라이드 추가'}
          </h2>
          <button onClick={onClose} className="text-tag-text text-xl leading-none">✕</button>
        </div>

        {/* 폼 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-4">

            {/* 슬라이드 타입 */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">슬라이드 타입 *</label>
              <select
                className="w-full h-[52px] px-4 border border-tag-bg rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                {...register('type')}
              >
                {(['GATHERING', 'CALENDAR', 'STORY'] as HeroSlideType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            {/* 이미지 업로드 (9:16 크롭) */}
            <div>
              <ImageUploadField
                label="슬라이드 이미지 *"
                previewUrl={imagePreviewUrl}
                cropRatio="9:16"
                cropContext="carousel"
                onConfirm={handleImageConfirm}
                onClear={handleImageClear}
                isUploading={isUploading}
                aspectClassName="aspect-[9/16]"
              />
              {errors.imageUrl && (
                <p className="text-xs text-red-500 mt-1">{errors.imageUrl.message}</p>
              )}
            </div>

            <Input
              label="제목 (메인 텍스트) *"
              placeholder="슬라이드에 표시될 제목"
              error={errors.title?.message}
              {...register('title')}
            />

            {typeValue === 'STORY' && (
              <Input
                label="서브 텍스트"
                placeholder="예: 와썹하우스"
                {...register('content')}
              />
            )}

            {typeValue === 'GATHERING' && (
              <Input
                label="게더링 ID"
                placeholder="연결할 게더링 UUID (날짜는 게더링에서 자동 표시)"
                {...register('gatheringId')}
              />
            )}

            <Input
              label="노출 순서 *"
              type="number"
              min={1}
              error={errors.sortOrder?.message}
              {...register('sortOrder', { valueAsNumber: true })}
            />

          </div>
        </div>

        {/* 하단 액션 */}
        <div className="border-t border-tag-bg">
          {isEdit && !deleteConfirm && (
            <div className="flex gap-2 px-6 pt-4 pb-0">
              <button
                type="button"
                onClick={handleToggle}
                disabled={isToggling}
                className={`flex-1 py-2 text-xs font-medium rounded-input border transition-colors disabled:opacity-50 ${
                  isActive
                    ? 'border-tag-bg text-tag-text hover:border-foreground'
                    : 'border-primary text-primary hover:bg-primary/5'
                }`}
              >
                {isActive ? '비노출로 변경' : '노출로 변경'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="flex-1 py-2 text-xs font-medium rounded-input border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
              >
                삭제
              </button>
            </div>
          )}

          {deleteConfirm && (
            <div className="px-6 pt-4 pb-0">
              <p className="text-xs text-tag-text text-center mb-2">삭제하면 복구할 수 없습니다. 계속할까요?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(false)}
                  className="flex-1 py-2 text-xs border border-tag-bg rounded-input text-tag-text hover:border-foreground transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2 text-xs bg-red-500 text-white rounded-input font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  삭제 확인
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 px-6 py-4">
            <Button variant="ghost" type="button" onClick={onClose} className="flex-1">취소</Button>
            <Button
              variant="primary"
              type="button"
              isLoading={isPending}
              disabled={isUploading}
              onClick={handleSubmit(onSubmit)}
              className="flex-1"
            >
              {isUploading ? '업로드 중...' : '저장하기'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
