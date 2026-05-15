'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { AdminHomeReview } from '@/lib/api/types'
import {
  useCreateHomeReview,
  useUpdateHomeReview,
  useDeleteHomeReview,
  useToggleHomeReview,
} from '@/lib/hooks/useAdminHomeReview'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const schema = z.object({
  authorName: z.string().min(1, '작성자명을 입력해주세요'),
  avatarUrl: z.string().optional(),
  gatheringTitle: z.string().min(1, '게더링 제목을 입력해주세요'),
  content: z.string().min(10, '후기는 10자 이상 입력해주세요'),
  rating: z.number({ error: '별점을 선택해주세요' }).int().min(1).max(5),
  displayOrder: z.number({ error: '순서를 입력해주세요' }).int().min(1, '1 이상이어야 합니다'),
})

type FormValues = z.infer<typeof schema>

interface HomeReviewFormPanelProps {
  review: AdminHomeReview | null
  onClose: () => void
  onSuccess: () => void
}

export function HomeReviewFormPanel({ review, onClose, onSuccess }: HomeReviewFormPanelProps) {
  const isEdit = !!review
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isActive, setIsActive] = useState(review?.isActive ?? true)
  const [trackedReviewId, setTrackedReviewId] = useState(review?.id ?? null)

  if ((review?.id ?? null) !== trackedReviewId) {
    setTrackedReviewId(review?.id ?? null)
    setIsActive(review?.isActive ?? true)
  }

  const { mutate: create, isPending: isCreating } = useCreateHomeReview(onSuccess)
  const { mutate: update, isPending: isUpdating } = useUpdateHomeReview(onSuccess)
  const { mutate: remove, isPending: isDeleting } = useDeleteHomeReview()
  const { mutate: toggle, isPending: isToggling } = useToggleHomeReview()
  const isPending = isCreating || isUpdating

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rating: 5, displayOrder: 1 },
  })

  useEffect(() => {
    if (review) {
      setValue('authorName', review.authorName)
      setValue('avatarUrl', review.avatarUrl ?? '')
      setValue('gatheringTitle', review.gatheringTitle)
      setValue('content', review.content)
      setValue('rating', review.rating)
      setValue('displayOrder', review.displayOrder)
    } else {
      reset({ rating: 5, displayOrder: 1 })
    }
  }, [review, setValue, reset])

  const onSubmit = (values: FormValues) => {
    const data = {
      authorName: values.authorName,
      avatarUrl: values.avatarUrl || undefined,
      gatheringTitle: values.gatheringTitle,
      content: values.content,
      rating: values.rating,
      displayOrder: values.displayOrder,
    }
    if (isEdit) {
      update({ id: review.id, data })
    } else {
      create(data)
    }
  }

  const handleToggle = () => {
    if (!review) return
    toggle(review.id, {
      onSuccess: () => {
        setIsActive((prev) => !prev)
      },
    })
  }

  const handleDelete = () => {
    if (!review) return
    remove(review.id, { onSuccess: onSuccess })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 w-[480px] h-full bg-card shadow-2xl z-50 flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-tag-bg">
          <h2 className="font-bold text-[18px] text-foreground">
            {isEdit ? '후기 수정' : '후기 추가'}
          </h2>
          <button onClick={onClose} className="text-tag-text text-xl leading-none">✕</button>
        </div>

        {/* 폼 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-4">

            <Input
              label="작성자명 *"
              placeholder="닉네임 또는 이름"
              error={errors.authorName?.message}
              {...register('authorName')}
            />

            <Input
              label="프로필 이미지 URL"
              placeholder="https://example.com/avatar.jpg"
              {...register('avatarUrl')}
            />

            <Input
              label="게더링 제목 *"
              placeholder="후기가 속한 게더링 이름"
              error={errors.gatheringTitle?.message}
              {...register('gatheringTitle')}
            />

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">후기 내용 * (10자 이상)</label>
              <textarea
                className="w-full h-[100px] px-4 py-3 border border-tag-bg rounded-input text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="홈 화면에 노출될 후기 내용을 입력해주세요"
                {...register('content')}
              />
              {errors.content && (
                <p className="text-xs text-red-500 mt-1">{errors.content.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">별점 *</label>
              <select
                className="w-full h-[52px] px-4 border border-tag-bg rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                {...register('rating', { valueAsNumber: true })}
              >
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>{'★'.repeat(r)} {r}점</option>
                ))}
              </select>
              {errors.rating && (
                <p className="text-xs text-red-500 mt-1">{errors.rating.message}</p>
              )}
            </div>

            <Input
              label="노출 순서 *"
              type="number"
              min={1}
              error={errors.displayOrder?.message}
              {...register('displayOrder', { valueAsNumber: true })}
            />

          </div>
        </div>

        {/* 하단 액션 */}
        <div className="border-t border-tag-bg">
          {/* 노출 토글 + 삭제 (수정 모드일 때만) */}
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

          {/* 삭제 확인 */}
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

          {/* 저장/취소 */}
          <div className="flex gap-3 px-6 py-4">
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
      </div>
    </>
  )
}
